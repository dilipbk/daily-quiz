import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { correct, incorrect, invalid, unanswered } from '../../src/core/module.ts';
import type { Grade } from '../../src/core/module.ts';
import {
  difficultyMultiplier,
  scoreAnswer,
  scoreInputSchema,
  scoreSession,
  scoringConfigSchema,
} from '../../src/core/scoring.ts';
import type { AnswerScore, ScoreInput, ScoringConfig } from '../../src/core/scoring.ts';

// Arbitraries. Each draws only values its schema accepts; the first test holds them to that.

const scoringConfig: fc.Arbitrary<ScoringConfig> = fc.record({
  basePoints: fc.integer({ min: 1, max: 1_000 }),
  difficulty: fc
    .tuple(
      fc.integer({ min: 0, max: 3_000 }),
      fc.integer({ min: 1, max: 2_000 }),
      fc.double({ min: 0.1, max: 3, noNaN: true }),
      fc.double({ min: 0, max: 3, noNaN: true }),
    )
    .map(([minRating, span, minMultiplier, spread]) => ({
      minRating,
      maxRating: minRating + span,
      minMultiplier,
      maxMultiplier: minMultiplier + spread,
    })),
  speedBonusMaxRatio: fc.double({ min: 0, max: 2, noNaN: true }),
  comboStep: fc.integer({ min: 0, max: 100 }),
  comboCap: fc.integer({ min: 0, max: 500 }),
});

const grade: fc.Arbitrary<Grade> = fc.oneof(
  fc.constant(correct()),
  fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }).map((credit) => incorrect(credit)),
  fc.constant(unanswered()),
  fc.constantFrom('unknown_type', 'type_mismatch', 'malformed').map((reason) => invalid(reason)),
);

const multiplier = fc.double({ min: 0.5, max: 2, noNaN: true });
const elapsedMs = fc.integer({ min: 0, max: 120_000 });
const standardLimitMs = fc.integer({ min: 1_000, max: 60_000 });
const streakBefore = fc.integer({ min: 0, max: 20 });

const timedInput: fc.Arbitrary<ScoreInput & { timing: { timed: true } }> = fc.record({
  grade,
  difficultyMultiplier: multiplier,
  timing: fc.record({ timed: fc.constant(true), elapsedMs, standardLimitMs }),
});

const scoreInput: fc.Arbitrary<ScoreInput> = fc.oneof(
  timedInput,
  fc.record({
    grade,
    difficultyMultiplier: multiplier,
    timing: fc.constant({ timed: false as const }),
  }),
);

const isWholePoints = (value: number): boolean => Number.isInteger(value) && value >= 0;

describe('scoring properties', () => {
  it('the arbitraries draw only what the schemas accept', () => {
    fc.assert(
      fc.property(scoringConfig, scoreInput, (config, input) => {
        expect(scoringConfigSchema.safeParse(config).success).toBe(true);
        expect(scoreInputSchema.safeParse(input).success).toBe(true);
      }),
    );
  });

  it('total is base + speedBonus + combo, and every part is a finite integer ≥ 0', () => {
    fc.assert(
      fc.property(scoreInput, streakBefore, scoringConfig, (input, streak, config) => {
        const score = scoreAnswer(input, streak, config);

        expect(score.total).toBe(score.base + score.speedBonus + score.combo);
        expect(Object.values(score).every(isWholePoints)).toBe(true);
      }),
    );
  });

  it("no multiplier, however large, earns a base above the config's top anchor", () => {
    const anyMultiplier = fc.oneof(
      multiplier,
      fc.double({ min: 0, max: 1e12, noNaN: true }),
      fc.constantFrom(Number.MAX_VALUE, Number.POSITIVE_INFINITY, Number.NaN, -1),
    );

    fc.assert(
      fc.property(
        scoreInput,
        anyMultiplier,
        streakBefore,
        scoringConfig,
        (input, any, streak, config) => {
          const score = scoreAnswer({ ...input, difficultyMultiplier: any }, streak, config);

          expect(score.base).toBeLessThanOrEqual(
            Math.round(config.basePoints * config.difficulty.maxMultiplier),
          );
          expect(Object.values(score).every(isWholePoints)).toBe(true);
        },
      ),
    );
  });

  it('the speed bonus never exceeds round(base × speedBonusMaxRatio) and never rises as elapsed time rises', () => {
    fc.assert(
      fc.property(
        timedInput,
        elapsedMs,
        streakBefore,
        scoringConfig,
        (input, otherElapsedMs, streak, config) => {
          const at = (elapsed: number) =>
            scoreAnswer(
              { ...input, timing: { ...input.timing, elapsedMs: elapsed } },
              streak,
              config,
            );
          const sooner = at(Math.min(input.timing.elapsedMs, otherElapsedMs));
          const later = at(Math.max(input.timing.elapsedMs, otherElapsedMs));

          expect(later.speedBonus).toBeLessThanOrEqual(sooner.speedBonus);
          expect(sooner.speedBonus).toBeLessThanOrEqual(
            Math.round(sooner.base * config.speedBonusMaxRatio),
          );
        },
      ),
    );
  });

  it('D13: at or beyond the Standard limit the speed bonus is 0', () => {
    fc.assert(
      fc.property(
        timedInput,
        fc.integer({ min: 0, max: 120_000 }),
        streakBefore,
        scoringConfig,
        (input, overrunMs, streak, config) => {
          const late = {
            ...input,
            timing: { ...input.timing, elapsedMs: input.timing.standardLimitMs + overrunMs },
          };

          expect(scoreAnswer(late, streak, config).speedBonus).toBe(0);
        },
      ),
    );
  });

  it('D13: Standard, ×1.5 and ×2 players with the same answers and times score the same', () => {
    // The A11Y-08 setting lives here, in the test: ScoreInput has nowhere to put it.
    const settings = [1, 1.5, 2];

    interface Played {
      readonly grade: Grade;
      readonly difficultyMultiplier: number;
      readonly standardLimitMs: number;
      readonly elapsedMs: number;
    }

    /** Answers a player on `slowest` could have given: each inside that player's own deadline. */
    const playedWithin = (slowest: number): fc.Arbitrary<Played[]> =>
      fc.array(
        fc
          .record({
            grade,
            difficultyMultiplier: multiplier,
            standardLimitMs,
            shareOfDeadline: fc.double({ min: 0, max: 1, noNaN: true }),
          })
          .map(({ shareOfDeadline, ...played }) => ({
            ...played,
            elapsedMs: Math.floor(shareOfDeadline * slowest * played.standardLimitMs),
          })),
        { maxLength: 12 },
      );

    /** What a device on `setting` reports: past its own deadline the question timed out. */
    const reportedOn =
      (setting: number) =>
      (played: Played): ScoreInput => ({
        grade: played.elapsedMs <= setting * played.standardLimitMs ? played.grade : unanswered(),
        difficultyMultiplier: played.difficultyMultiplier,
        timing: {
          timed: true,
          elapsedMs: played.elapsedMs,
          standardLimitMs: played.standardLimitMs,
        },
      });

    fc.assert(
      fc.property(
        fc
          .constantFrom(...settings)
          .chain((slowest) => fc.tuple(fc.constant(slowest), playedWithin(slowest))),
        scoringConfig,
        ([slowest, played], config) => {
          const scores = settings
            .filter((setting) => setting >= slowest)
            .map((setting) => scoreSession(played.map(reportedOn(setting)), config));

          for (const score of scores) expect(score).toEqual(scores[0]);

          // Time past the Standard limit neither helps nor hurts: it scores as an answer at the limit.
          const atTheLimit = played.map((answer) => ({
            ...answer,
            elapsedMs: Math.min(answer.elapsedMs, answer.standardLimitMs),
          }));
          expect(scoreSession(atTheLimit.map(reportedOn(2)), config)).toEqual(scores[0]);
        },
      ),
    );
  });

  it('combo is min(comboStep × (streak − 1), comboCap) on a correct answer and 0 otherwise', () => {
    fc.assert(
      fc.property(scoreInput, streakBefore, scoringConfig, (input, streak, config) => {
        const score = scoreAnswer(input, streak, config);

        if (input.grade.status === 'correct') {
          expect(score.streak).toBe(streak + 1);
          expect(score.combo).toBe(Math.min(config.comboStep * streak, config.comboCap));
        } else {
          expect(score.streak).toBe(0);
          expect(score.combo).toBe(0);
        }
      }),
    );
  });

  it('scoreSession equals folding scoreAnswer over the inputs', () => {
    fc.assert(
      fc.property(fc.array(scoreInput, { maxLength: 30 }), scoringConfig, (inputs, config) => {
        const folded: AnswerScore[] = [];
        for (const input of inputs) {
          folded.push(scoreAnswer(input, folded.at(-1)?.streak ?? 0, config));
        }
        const session = scoreSession(inputs, config);

        expect(session.answers).toEqual(folded);
        expect(session.totalPoints).toBe(folded.reduce((sum, answer) => sum + answer.total, 0));
        expect(session.correctCount).toBe(
          inputs.filter((input) => input.grade.status === 'correct').length,
        );
        expect(session.questionCount).toBe(inputs.length);
      }),
    );
  });

  it('difficultyMultiplier is monotonic in the rating and stays within [minMultiplier, maxMultiplier]', () => {
    const rating = fc.double({ min: -1_000, max: 6_000, noNaN: true });

    fc.assert(
      fc.property(rating, rating, scoringConfig, (a, b, { difficulty }) => {
        const lower = difficultyMultiplier(Math.min(a, b), difficulty);
        const higher = difficultyMultiplier(Math.max(a, b), difficulty);

        expect(lower).toBeLessThanOrEqual(higher);
        expect(lower).toBeGreaterThanOrEqual(difficulty.minMultiplier);
        expect(higher).toBeLessThanOrEqual(difficulty.maxMultiplier);
      }),
    );
  });
});
