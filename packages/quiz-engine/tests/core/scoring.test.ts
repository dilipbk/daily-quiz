import { describe, expect, it } from 'vitest';
import { correct, incorrect, invalid, unanswered } from '../../src/core/module.ts';
import {
  difficultyMultiplier,
  scoreAnswer,
  scoreInputSchema,
  scoreSession,
  scoringConfigSchema,
  specScoringConfig,
} from '../../src/core/scoring.ts';
import type { ScoreInput, ScoreTiming, ScoringConfig } from '../../src/core/scoring.ts';

const C = specScoringConfig;

const timed = (elapsedMs: number, standardLimitMs: number) =>
  ({ timed: true, elapsedMs, standardLimitMs }) as const;
const untimed = { timed: false } as const;

describe('scoreAnswer', () => {
  it('§10.5 base points are 100 × the difficulty multiplier', () => {
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 0.8, timing: { timed: false } }, 0, C)
        .base,
    ).toBe(80);
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: { timed: false } }, 0, C)
        .base,
    ).toBe(150);
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1.15, timing: { timed: false } }, 0, C)
        .base,
    ).toBe(115);
  });

  it('§10.5 speed bonus is up to +50% of base, proportional to time left on the Standard limit', () => {
    // DS-01's example: an easy answer with 80% of the limit left is 80 + 32 = 112.
    expect(
      scoreAnswer(
        { grade: correct(), difficultyMultiplier: 0.8, timing: timed(4_000, 20_000) },
        0,
        C,
      ),
    ).toEqual({
      base: 80,
      speedBonus: 32,
      combo: 0,
      total: 112,
      streak: 1,
    });
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: timed(0, 20_000) }, 0, C)
        .speedBonus,
    ).toBe(75);
    expect(
      scoreAnswer(
        { grade: correct(), difficultyMultiplier: 1.15, timing: timed(10_000, 30_000) },
        0,
        C,
      ).total,
    ).toBe(153);
  });

  it('§10.5 combo adds 10 per consecutive correct answer after the first, capped at 50', () => {
    const eight = Array.from({ length: 8 }, () => ({
      grade: correct(),
      difficultyMultiplier: 1,
      timing: { timed: false } as const,
    }));
    const score = scoreSession(eight, C);
    expect(score.answers.map((a) => a.combo)).toEqual([0, 10, 20, 30, 40, 50, 50, 50]);
    expect(score.totalPoints).toBe(1050);
  });

  it('D13: an answer after the Standard limit keeps its base points and earns no speed bonus', () => {
    // A ×2 player answering at 30 s on a 20 s Standard limit, and a Standard player at exactly 20 s.
    const late = scoreAnswer(
      { grade: correct(), difficultyMultiplier: 1.5, timing: timed(30_000, 20_000) },
      0,
      C,
    );
    const atLimit = scoreAnswer(
      { grade: correct(), difficultyMultiplier: 1.5, timing: timed(20_000, 20_000) },
      0,
      C,
    );
    expect(late).toEqual({ base: 150, speedBonus: 0, combo: 0, total: 150, streak: 1 });
    expect(atLimit).toEqual(late);
  });

  it("D13: scoring has no input for the player's time setting", () => {
    const input = { grade: correct(), difficultyMultiplier: 1, timing: timed(1_000, 20_000) };
    expect(scoreInputSchema.safeParse(input).success).toBe(true);
    expect(scoreInputSchema.safeParse({ ...input, timeMultiplier: 2 }).success).toBe(false);
    expect(
      scoreInputSchema.safeParse({ ...input, timing: { ...input.timing, extendedLimitMs: 40_000 } })
        .success,
    ).toBe(false);
  });

  it("§10.5 an answer that isn't correct scores 0 and resets the streak", () => {
    for (const grade of [incorrect(), unanswered(), invalid('malformed')]) {
      const missed = scoreAnswer(
        { grade, difficultyMultiplier: 1.5, timing: timed(0, 20_000) },
        3,
        C,
      );

      expect(missed).toEqual({ base: 0, speedBonus: 0, combo: 0, total: 0, streak: 0 });
      expect(
        scoreAnswer(
          { grade: correct(), difficultyMultiplier: 1, timing: untimed },
          missed.streak,
          C,
        ),
      ).toEqual({ base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 });
    }
  });

  it('§10.5 untimed answers earn no speed bonus', () => {
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: untimed }, 2, C),
    ).toEqual({ base: 150, speedBonus: 0, combo: 20, total: 170, streak: 3 });
  });

  it('§10.5 every value comes from the config passed in', () => {
    const custom: ScoringConfig = {
      ...C,
      basePoints: 200,
      speedBonusMaxRatio: 1,
      comboStep: 5,
      comboCap: 5,
    };
    const ds01 = { grade: correct(), difficultyMultiplier: 0.8, timing: timed(4_000, 20_000) };

    expect(scoreAnswer(ds01, 0, custom)).toMatchObject({ base: 160, speedBonus: 128 });
    expect(scoreAnswer(ds01, 2, custom)).toMatchObject({ combo: 5, streak: 3 });
    expect(
      difficultyMultiplier(1500, {
        minRating: 1000,
        maxRating: 2000,
        minMultiplier: 1,
        maxMultiplier: 3,
      }),
    ).toBe(2);
  });

  it('§10.5 the spec values exist once, as data that passes its own schema', () => {
    expect(specScoringConfig).toEqual({
      basePoints: 100,
      difficulty: { minRating: 1200, maxRating: 1800, minMultiplier: 0.8, maxMultiplier: 1.5 },
      speedBonusMaxRatio: 0.5,
      comboStep: 10,
      comboCap: 50,
    });
    expect(scoringConfigSchema.parse(specScoringConfig)).toEqual(specScoringConfig);
    expect(Object.isFrozen(specScoringConfig)).toBe(true);
    expect(Object.isFrozen(specScoringConfig.difficulty)).toBe(true);
  });

  it('§10.5 the difficulty multiplier is a clamped line between the rating anchors', () => {
    expect(difficultyMultiplier(1200, C.difficulty)).toBe(0.8);
    expect(difficultyMultiplier(1800, C.difficulty)).toBe(1.5);
    expect(difficultyMultiplier(1500, C.difficulty)).toBeCloseTo(1.15);
    expect(difficultyMultiplier(900, C.difficulty)).toBe(0.8);
    expect(difficultyMultiplier(2400, C.difficulty)).toBe(1.5);

    // The line's own arithmetic can pass an anchor by one bit: 0.3 + (0.9 − 0.3) is 0.9000000000000001.
    const tenths = { ...C.difficulty, minMultiplier: 0.3, maxMultiplier: 0.9 };
    expect(difficultyMultiplier(1800, tenths)).toBe(0.9);
    expect(difficultyMultiplier(2400, tenths)).toBe(0.9);
  });

  it("§10.5 a multiplier beyond the config's anchors scores as the anchor it passed", () => {
    const scoreWith = (difficultyMultiplier: number, timing: ScoreTiming = untimed) =>
      scoreAnswer({ grade: correct(), difficultyMultiplier, timing }, 0, C);

    expect(scoreWith(1e9).base).toBe(150);
    expect(scoreWith(Number.MAX_VALUE).base).toBe(150);
    expect(scoreWith(1.5000001).base).toBe(150);
    expect(scoreWith(0.1).base).toBe(80);
    // The speed bonus is a share of the base it is given, so it is held with it.
    expect(scoreWith(1e9, timed(0, 20_000))).toEqual({
      base: 150,
      speedBonus: 75,
      combo: 0,
      total: 225,
      streak: 1,
    });
    // The anchors are the config's, not the spec's.
    const wide = { ...C, difficulty: { ...C.difficulty, minMultiplier: 0.5, maxMultiplier: 3 } };
    const widely = (difficultyMultiplier: number) =>
      scoreAnswer({ grade: correct(), difficultyMultiplier, timing: untimed }, 0, wide).base;
    expect(widely(2)).toBe(200);
    expect(widely(1e9)).toBe(300);
    expect(widely(0.1)).toBe(50);
    // No multiplier at all still earns nothing.
    for (const garbage of [0, -2, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(scoreWith(garbage).base, String(garbage)).toBe(0);
    }
  });

  it('time at, just inside and beyond the limit', () => {
    const bonusAt = (elapsedMs: number) =>
      scoreAnswer(
        { grade: correct(), difficultyMultiplier: 1, timing: timed(elapsedMs, 20_000) },
        0,
        C,
      ).speedBonus;

    expect(bonusAt(20_000)).toBe(0);
    expect(bonusAt(20_001)).toBe(0);
    expect(bonusAt(19_999)).toBe(0);
    expect(bonusAt(10_000)).toBe(25);
  });

  it("impossible time values can't raise a score", () => {
    const scoreAt = (timing: ScoreTiming) =>
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1, timing }, 0, C);
    const impossible = [
      timed(-5_000, 20_000),
      timed(1_000, 0),
      timed(1_000, -20_000),
      timed(Number.NaN, 20_000),
      timed(1_000, Number.NaN),
      timed(1_000, Number.POSITIVE_INFINITY),
      timed(9_999.5, 20_000),
    ];

    expect(scoreAt(timed(-5_000, 20_000))).toEqual(scoreAt(timed(0, 20_000)));
    expect(scoreAt(timed(1_000, 0)).speedBonus).toBe(0);
    expect(scoreAt(timed(1_000, -20_000)).speedBonus).toBe(0);
    expect(scoreAt(timed(Number.NaN, 20_000)).speedBonus).toBe(0);
    expect(scoreAt(timed(1_000, Number.NaN)).speedBonus).toBe(0);

    for (const timing of impossible) {
      const score = scoreAt(timing);

      expect(Object.values(score).every(Number.isInteger), JSON.stringify(score)).toBe(true);
      expect(score.speedBonus).toBeLessThanOrEqual(50);
    }
  });

  it('values that skipped the schemas never produce NaN or negative points', () => {
    const sound: ScoreInput = {
      grade: correct(),
      difficultyMultiplier: 1,
      timing: timed(4_000, 20_000),
    };
    const garbage: [ScoreInput, number, ScoringConfig][] = [
      [sound, 3, { ...C, comboStep: -10 }],
      [sound, 3, { ...C, comboStep: 2.5 }],
      [sound, 3, { ...C, comboCap: Number.NaN }],
      [sound, 3, { ...C, basePoints: Number.NaN }],
      [sound, 3, { ...C, basePoints: -100 }],
      [sound, 3, { ...C, speedBonusMaxRatio: -1 }],
      [sound, 3, { ...C, speedBonusMaxRatio: Number.NaN }],
      [{ ...sound, difficultyMultiplier: Number.NaN }, 3, C],
      [{ ...sound, difficultyMultiplier: -2 }, 3, C],
      [{ ...sound, difficultyMultiplier: Number.POSITIVE_INFINITY }, 3, C],
      [{ ...sound, grade: { status: 'correct', credit: Number.NaN } }, 3, C],
      [{ ...sound, grade: { status: 'incorrect', credit: 7 } }, 3, C],
      [sound, Number.NaN, C],
      [sound, -4, C],
      [sound, 2.5, C],
    ];

    for (const [input, streakBefore, config] of garbage) {
      const score = scoreAnswer(input, streakBefore, config);
      const parts = Object.values(score);

      expect(
        parts.every((part) => Number.isInteger(part) && part >= 0),
        JSON.stringify(score),
      ).toBe(true);
      expect(score.total).toBe(score.base + score.speedBonus + score.combo);
    }

    expect(scoreAnswer(sound, 3, { ...C, comboStep: -10 }).combo).toBe(0);
    // Credit above 1 pays no more than a full base.
    expect(scoreAnswer({ ...sound, grade: { status: 'incorrect', credit: 7 } }, 0, C).base).toBe(
      100,
    );
    // A config whose two ratings are equal has no line to draw; it still gives a number in range.
    const flat = { ...C.difficulty, minRating: 1500, maxRating: 1500 };
    for (const rating of [1499, 1500, 1501, Number.NaN]) {
      expect(difficultyMultiplier(rating, flat)).toBeGreaterThanOrEqual(0.8);
      expect(difficultyMultiplier(rating, flat)).toBeLessThanOrEqual(1.5);
    }
  });

  it('the config and input schemas refuse impossible values', () => {
    const flatDifficulty = { ...C, difficulty: { ...C.difficulty, minMultiplier: 1.5 } };
    expect(scoringConfigSchema.safeParse(flatDifficulty).success).toBe(true);

    const refusedConfigs = [
      { ...C, comboStep: -1 },
      { ...C, comboStep: 2.5 },
      { ...C, comboCap: -1 },
      { ...C, difficulty: { ...C.difficulty, minRating: 1800 } },
      { ...C, difficulty: { ...C.difficulty, minRating: 1900 } },
      { ...C, difficulty: { ...C.difficulty, minMultiplier: 1.6 } },
      { ...C, difficulty: { ...C.difficulty, minMultiplier: 0 } },
      { ...C, difficulty: { ...C.difficulty, maxMultiplier: Number.POSITIVE_INFINITY } },
      { ...C, difficulty: { ...C.difficulty, maxMultiplier: 10.5 } },
      { ...C, difficulty: { ...C.difficulty, minMultiplier: 11, maxMultiplier: 11 } },
      { ...C, difficulty: { ...C.difficulty, curve: 'linear' } },
      { ...C, basePoints: 99.5 },
      { ...C, basePoints: 0 },
      { ...C, basePoints: -100 },
      { ...C, speedBonusMaxRatio: -0.5 },
      { ...C, speedBonusMaxRatio: Number.NaN },
      { ...C, timeMultiplier: 2 },
      { basePoints: 100 },
    ];
    for (const config of refusedConfigs) {
      expect(scoringConfigSchema.safeParse(config).success, JSON.stringify(config)).toBe(false);
    }

    const input = { grade: correct(), difficultyMultiplier: 1, timing: timed(1_000, 20_000) };
    expect(scoreInputSchema.parse(input)).toEqual(input);
    expect(scoreInputSchema.safeParse({ ...input, timing: untimed }).success).toBe(true);

    const refusedInputs = [
      { ...input, timing: timed(-1, 20_000) },
      { ...input, timing: timed(1_000.5, 20_000) },
      { ...input, timing: timed(1_000, 0) },
      { ...input, timing: timed(1_000, -20_000) },
      { ...input, timing: timed(Number.NaN, 20_000) },
      { ...input, timing: { timed: false, elapsedMs: 1_000 } },
      { ...input, timing: { timed: true } },
      { ...input, difficultyMultiplier: 0 },
      { ...input, difficultyMultiplier: -1 },
      { ...input, difficultyMultiplier: Number.NaN },
      { ...input, difficultyMultiplier: 1e9 },
      { ...input, difficultyMultiplier: 10.5 },
      { ...input, difficultyMultiplier: Number.POSITIVE_INFINITY },
      { ...input, grade: { status: 'correct', credit: 0.5 } },
      { ...input, grade: { status: 'incorrect', credit: 1 } },
    ];
    for (const refused of refusedInputs) {
      expect(scoreInputSchema.safeParse(refused).success, JSON.stringify(refused)).toBe(false);
    }

    // One ceiling for both: the largest multiplier a config can produce is one an input may carry.
    const steepest = { ...C, difficulty: { ...C.difficulty, maxMultiplier: 10 } };
    expect(scoringConfigSchema.safeParse(steepest).success).toBe(true);
    expect(scoreInputSchema.safeParse({ ...input, difficultyMultiplier: 10 }).success).toBe(true);
  });

  it('rounds base and speed bonus half up, takes the bonus from the rounded base, and leaves the combo flat', () => {
    // 161 × 0.5 is 80.5, so base is 81. Half of 81 is 40.5, so an instant answer earns 41: a bonus
    // taken from the unrounded 80.5 would be 40. The anchors are widened to take a multiplier of 0.5.
    const config: ScoringConfig = {
      ...C,
      basePoints: 161,
      difficulty: { ...C.difficulty, minMultiplier: 0.5 },
    };

    expect(
      scoreAnswer(
        { grade: correct(), difficultyMultiplier: 0.5, timing: timed(0, 20_000) },
        2,
        config,
      ),
    ).toEqual({ base: 81, speedBonus: 41, combo: 20, total: 142, streak: 3 });
    // Neither difficulty nor speed multiplies the combo.
    expect(
      scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: timed(0, 20_000) }, 2, C)
        .combo,
    ).toBe(20);
  });

  it('partial credit scales base and speed bonus and breaks the streak', () => {
    expect(
      scoreAnswer(
        { grade: incorrect(0.5), difficultyMultiplier: 1, timing: timed(0, 20_000) },
        3,
        C,
      ),
    ).toEqual({ base: 50, speedBonus: 25, combo: 0, total: 75, streak: 0 });
  });
});
