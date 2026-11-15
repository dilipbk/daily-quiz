import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parseLocalDate } from '../src/local-date.ts';
import { DEFAULT_GAME_RULES, type GameRules } from '../src/rules.ts';
import { cappedPendingXp, optimisticXp, sessionXp } from '../src/xp.ts';

const withXpRules = (overrides: Partial<GameRules['xp']>): GameRules => ({
  ...DEFAULT_GAME_RULES,
  xp: { ...DEFAULT_GAME_RULES.xp, ...overrides },
});

const monday = parseLocalDate('2026-03-02');
const tuesday = parseLocalDate('2026-03-03');

describe('sessionXp (XP-01)', () => {
  it.each([
    { correctAnswers: 0, xp: 10 },
    { correctAnswers: 5, xp: 20 },
    { correctAnswers: 7, xp: 24 },
    { correctAnswers: 8, xp: 36 },
  ])('pays $xp for a Global Daily with $correctAnswers of 8 right', ({ correctAnswers, xp }) => {
    expect(
      sessionXp({ source: 'global_daily', mode: 'standard', correctAnswers, totalQuestions: 8 }),
    ).toBe(xp);
  });

  it('pays 30 for a perfect Daily 5', () => {
    expect(
      sessionXp({ source: 'daily_5', mode: 'standard', correctAnswers: 5, totalQuestions: 5 }),
    ).toBe(30);
  });

  it('pays full XP in Relaxed mode (PLAY-02)', () => {
    expect(
      sessionXp({ source: 'quiz', mode: 'relaxed', correctAnswers: 10, totalQuestions: 10 }),
    ).toBe(40);
  });

  it('pays for completing a session with no questions, without a perfect bonus', () => {
    expect(
      sessionXp({ source: 'quiz', mode: 'standard', correctAnswers: 0, totalQuestions: 0 }),
    ).toBe(10);
  });

  it.each([
    { correctAnswers: 10, totalQuestions: 10, xp: 20 },
    { correctAnswers: 3, totalQuestions: 5, xp: 8 },
    { correctAnswers: 4, totalQuestions: 5, xp: 9 },
  ])(
    'pays half, rounded down, for a Practice replay: $correctAnswers of $totalQuestions gives $xp',
    ({ correctAnswers, totalQuestions, xp }) => {
      expect(sessionXp({ source: 'quiz', mode: 'practice', correctAnswers, totalQuestions })).toBe(
        xp,
      );
    },
  );

  it.each(['global_daily', 'daily_5'] as const)(
    'pays nothing for a Practice replay of a %s (DLY-03)',
    (source) => {
      expect(sessionXp({ source, mode: 'practice', correctAnswers: 5, totalQuestions: 5 })).toBe(0);
    },
  );

  it('reads every amount from the rules', () => {
    const rules = withXpRules({ perSession: 5, perCorrectAnswer: 1, perfectBonus: 0 });
    const perfect = {
      source: 'quiz',
      mode: 'standard',
      correctAnswers: 6,
      totalQuestions: 6,
    } as const;
    expect(sessionXp(perfect, rules)).toBe(11);
    expect(sessionXp({ ...perfect, mode: 'practice' }, withXpRules({ practiceFactor: 0 }))).toBe(0);
    expect(sessionXp({ ...perfect, mode: 'practice' }, withXpRules({ practiceFactor: 1 }))).toBe(
      32,
    );
  });

  it.each([
    { correctAnswers: 6, totalQuestions: 5 },
    { correctAnswers: -1, totalQuestions: 5 },
    { correctAnswers: 2.5, totalQuestions: 5 },
    { correctAnswers: Number.NaN, totalQuestions: 5 },
    { correctAnswers: 0, totalQuestions: -5 },
    { correctAnswers: 0, totalQuestions: Number.POSITIVE_INFINITY },
  ])('refuses $correctAnswers right of $totalQuestions', (counts) => {
    expect(() => sessionXp({ source: 'quiz', mode: 'standard', ...counts })).toThrow(RangeError);
  });

  const counts = fc.integer({ min: 0, max: 60 }).chain((totalQuestions) =>
    fc.record({
      totalQuestions: fc.constant(totalQuestions),
      correctAnswers: fc.integer({ min: 0, max: totalQuestions }),
    }),
  );
  const source = fc.constantFrom('global_daily', 'daily_5', 'quiz', 'challenge');

  it('follows the formula for any score: 10, plus 2 a correct answer, plus 10 when perfect', () => {
    fc.assert(
      fc.property(
        source,
        fc.constantFrom('standard', 'relaxed'),
        counts,
        (source, mode, counts) => {
          const { correctAnswers, totalQuestions } = counts;
          const perfect = totalQuestions > 0 && correctAnswers === totalQuestions;
          expect(sessionXp({ source, mode, ...counts })).toBe(
            10 + 2 * correctAnswers + (perfect ? 10 : 0),
          );
        },
      ),
    );
  });

  it('never pays less for one more correct answer, and never more for Practice', () => {
    fc.assert(
      fc.property(source, counts, (source, counts) => {
        const played = sessionXp({ source, mode: 'standard', ...counts });
        const replayed = sessionXp({ source, mode: 'practice', ...counts });
        expect(replayed).toBeLessThanOrEqual(played);
        expect(Number.isInteger(replayed)).toBe(true);

        if (counts.correctAnswers < counts.totalQuestions) {
          const oneMore = { ...counts, correctAnswers: counts.correctAnswers + 1 };
          expect(sessionXp({ source, mode: 'standard', ...oneMore })).toBeGreaterThan(played);
        }
      }),
    );
  });
});

describe('the offline XP cap (XP-04)', () => {
  it('caps the unsynced XP of one local day at 100', () => {
    const pending = [
      { date: monday, xp: 60 },
      { date: monday, xp: 70 },
    ];
    expect(cappedPendingXp(pending)).toEqual(new Map([[monday, 100]]));
    expect(optimisticXp(500, pending)).toBe(600);
  });

  it('caps each local day on its own', () => {
    const pending = [
      { date: monday, xp: 60 },
      { date: tuesday, xp: 70 },
    ];
    expect(cappedPendingXp(pending)).toEqual(
      new Map([
        [monday, 60],
        [tuesday, 70],
      ]),
    );
    expect(optimisticXp(500, pending)).toBe(630);
  });

  it('adds nothing when nothing is waiting to sync', () => {
    expect(cappedPendingXp([])).toEqual(new Map());
    expect(optimisticXp(500, [])).toBe(500);
  });

  it('reads the cap from the rules, and a cap of 0 shows no unsynced XP at all', () => {
    const pending = [{ date: monday, xp: 60 }];
    expect(optimisticXp(500, pending, withXpRules({ offlineDailyCap: 40 }))).toBe(540);
    expect(optimisticXp(500, pending, withXpRules({ offlineDailyCap: 0 }))).toBe(500);
  });

  it.each([-1, 1.5, Number.NaN])('refuses an XP amount of %j', (xp) => {
    expect(() => cappedPendingXp([{ date: monday, xp }])).toThrow(RangeError);
    expect(() => optimisticXp(xp, [])).toThrow(RangeError);
  });

  it('caps every day at the smaller of its sum and the cap, in any order', () => {
    const pending = fc.array(
      fc.record({
        date: fc.constantFrom(monday, tuesday, parseLocalDate('2026-03-08')),
        xp: fc.integer({ min: 0, max: 80 }),
      }),
      { maxLength: 12 },
    );
    const shuffled = pending.chain((entries) =>
      fc.tuple(fc.constant(entries), fc.shuffledSubarray(entries, { minLength: entries.length })),
    );
    fc.assert(
      fc.property(
        shuffled,
        fc.integer({ min: 0, max: 5000 }),
        ([entries, reordered], validated) => {
          const capped = cappedPendingXp(entries);
          for (const [date, xp] of capped) {
            const sum = entries
              .filter((e) => e.date === date)
              .reduce((total, e) => total + e.xp, 0);
            expect(xp).toBe(Math.min(sum, 100));
          }
          expect(new Set(capped.keys())).toEqual(new Set(entries.map((e) => e.date)));
          expect(cappedPendingXp(reordered)).toEqual(capped);
          expect(optimisticXp(validated, reordered)).toBe(optimisticXp(validated, entries));
        },
      ),
    );
  });
});
