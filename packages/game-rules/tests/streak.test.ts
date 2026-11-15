import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays, parseLocalDate, type LocalDate } from '../src/local-date.ts';
import { DEFAULT_GAME_RULES, type GameRules } from '../src/rules.ts';
import { deriveStreak, isQualifyingSession, nextMilestone } from '../src/streak.ts';

/** Day `n` of a test calendar whose day 1 is 2026-03-01. It crosses a month end and a US DST change. */
const day = (n: number): LocalDate => addDays(parseLocalDate('2026-03-01'), n - 1);
const days = (from: number, to: number): LocalDate[] =>
  Array.from({ length: to - from + 1 }, (_, i) => day(from + i));

const withStreakRules = (overrides: Partial<GameRules['streak']>): GameRules => ({
  ...DEFAULT_GAME_RULES,
  streak: { ...DEFAULT_GAME_RULES.streak, ...overrides },
});

describe('isQualifyingSession (STK-01)', () => {
  it.each([
    { source: 'global_daily', mode: 'standard', questionCount: 8 },
    { source: 'daily_5', mode: 'relaxed', questionCount: 5 },
    { source: 'global_daily', mode: 'standard', questionCount: 3 },
    { source: 'quiz', mode: 'standard', questionCount: 5 },
    { source: 'quiz', mode: 'relaxed', questionCount: 12 },
    { source: 'challenge', mode: 'standard', questionCount: 5 },
  ] as const)('counts a completed $source of $questionCount questions in $mode mode', (session) => {
    expect(isQualifyingSession(session)).toBe(true);
  });

  it.each([
    { source: 'quiz', mode: 'standard', questionCount: 4 },
    { source: 'challenge', mode: 'standard', questionCount: 4 },
    { source: 'quiz', mode: 'practice', questionCount: 10 },
    { source: 'global_daily', mode: 'practice', questionCount: 8 },
    { source: 'daily_5', mode: 'practice', questionCount: 5 },
  ] as const)('does not count a $source of $questionCount questions in $mode mode', (session) => {
    expect(isQualifyingSession(session)).toBe(false);
  });

  it('reads the minimum length from the rules', () => {
    const session = { source: 'quiz', mode: 'standard', questionCount: 3 } as const;
    expect(isQualifyingSession(session, withStreakRules({ minQuestions: 3 }))).toBe(true);
  });

  it.each([-1, 2.5, Number.NaN])('refuses a question count of %j', (questionCount) => {
    expect(() => isQualifyingSession({ source: 'quiz', mode: 'standard', questionCount })).toThrow(
      RangeError,
    );
  });
});

describe('deriveStreak', () => {
  it('starts with nothing', () => {
    expect(deriveStreak([], day(1))).toEqual({
      current: 0,
      best: 0,
      freezesHeld: 0,
      status: 'inactive',
      lastCreditedDate: null,
      frozenDates: [],
      milestoneHits: [],
    });
  });

  it('counts one per credited day, however many sessions that day had (STK-01)', () => {
    expect(deriveStreak([day(1), day(1), day(2), day(1)], day(2)).current).toBe(2);
  });

  it('reaches the 3-day milestone and earns a freeze (STK-06, STK-04)', () => {
    expect(deriveStreak(days(1, 3), day(3))).toEqual({
      current: 3,
      best: 3,
      freezesHeld: 1,
      status: 'lit',
      lastCreditedDate: day(3),
      frozenDates: [],
      milestoneHits: [{ milestone: 3, date: day(3) }],
    });
  });

  it('is at risk, not broken, until today is over', () => {
    expect(deriveStreak(days(1, 3), day(4))).toMatchObject({ current: 3, status: 'at_risk' });
  });

  it('spends a freeze on a missed day and keeps counting from where it was (STK-04)', () => {
    expect(deriveStreak([...days(1, 3), day(5)], day(5))).toMatchObject({
      current: 4,
      freezesHeld: 0,
      status: 'lit',
      frozenDates: [day(4)],
    });
  });

  it('shows as frozen the day after a freeze covered a miss', () => {
    expect(deriveStreak(days(1, 3), day(5))).toMatchObject({
      current: 3,
      freezesHeld: 0,
      status: 'frozen',
      frozenDates: [day(4)],
    });
  });

  it('covers two missed days in a row with two freezes, and breaks on the third', () => {
    const week = days(1, 7);
    expect(deriveStreak(week, day(8))).toMatchObject({ current: 7, freezesHeld: 2 });
    expect(deriveStreak(week, day(9))).toMatchObject({ current: 7, freezesHeld: 1 });
    expect(deriveStreak(week, day(10))).toMatchObject({
      current: 7,
      freezesHeld: 0,
      status: 'frozen',
      frozenDates: [day(8), day(9)],
    });
    expect(deriveStreak(week, day(11))).toMatchObject({
      current: 0,
      best: 7,
      freezesHeld: 0,
      status: 'inactive',
      frozenDates: [day(8), day(9)],
    });
  });

  it('keeps a freeze spent even when the streak breaks the next day', () => {
    expect(deriveStreak(days(1, 3), day(6))).toMatchObject({
      current: 0,
      best: 3,
      freezesHeld: 0,
      frozenDates: [day(4)],
    });
  });

  it('loses a freeze earned while already holding the most allowed', () => {
    const state = deriveStreak(days(1, 14), day(14));
    expect(state.freezesHeld).toBe(2);
    expect(state.milestoneHits.map((hit) => hit.milestone)).toEqual([3, 7, 14]);
  });

  it('grants the milestones of a new streak again after a break (ruling R3)', () => {
    expect(deriveStreak([...days(1, 3), ...days(6, 8)], day(8))).toMatchObject({
      current: 3,
      best: 3,
      freezesHeld: 1,
      milestoneHits: [
        { milestone: 3, date: day(3) },
        { milestone: 3, date: day(8) },
      ],
    });
  });

  it('remembers the best streak after a break, and raises it when beaten', () => {
    expect(deriveStreak([...days(1, 2), ...days(10, 14)], day(14))).toMatchObject({
      current: 5,
      best: 5,
    });
    expect(deriveStreak([...days(1, 5), ...days(20, 21)], day(21))).toMatchObject({
      current: 2,
      best: 5,
    });
  });

  it('returns the freeze when the missed day turns out to have been played (roadmap §4.3)', () => {
    const before = deriveStreak([...days(1, 3), day(5)], day(5));
    const after = deriveStreak([...days(1, 3), day(5), day(4)], day(5));
    expect(before).toMatchObject({ current: 4, freezesHeld: 0, frozenDates: [day(4)] });
    expect(after).toMatchObject({ current: 5, freezesHeld: 1, frozenDates: [] });
  });

  it('holds no day against the player before it is over, even with a later day credited', () => {
    // The player was credited day 3 further east, then flew west where it is still day 2.
    expect(deriveStreak([day(1), day(3)], day(2))).toMatchObject({
      current: 2,
      status: 'lit',
      frozenDates: [],
    });
    expect(deriveStreak([day(1), day(3)], day(3))).toMatchObject({ current: 1, best: 1 });
  });

  it('is lit when the last credited date is later than today', () => {
    expect(deriveStreak(days(1, 3), day(2))).toMatchObject({
      current: 3,
      freezesHeld: 1,
      status: 'lit',
      frozenDates: [],
    });
  });

  it('answers at once for a player who comes back after decades', () => {
    expect(deriveStreak(days(1, 7), day(10_007))).toMatchObject({
      current: 0,
      best: 7,
      freezesHeld: 0,
      status: 'inactive',
      frozenDates: [day(8), day(9)],
    });
  });

  it('never freezes when the rules allow no freezes', () => {
    expect(deriveStreak(days(1, 3), day(5), withStreakRules({ maxFreezesHeld: 0 }))).toMatchObject({
      current: 0,
      freezesHeld: 0,
      frozenDates: [],
    });
  });

  it('has no milestones when the rules list none', () => {
    expect(deriveStreak(days(1, 30), day(30), withStreakRules({ milestones: [] }))).toMatchObject({
      current: 30,
      freezesHeld: 0,
      milestoneHits: [],
    });
  });

  it('caps a larger grant at the most a player may hold', () => {
    const rules = withStreakRules({ freezesPerMilestone: 5 });
    expect(deriveStreak(days(1, 3), day(3), rules).freezesHeld).toBe(2);
  });
});

describe('nextMilestone (STK-06)', () => {
  it.each([
    [0, 3],
    [2, 3],
    [3, 7],
    [99, 100],
    [100, 365],
  ])('after %i days the next milestone is %i', (streak, next) => {
    expect(nextMilestone(streak)).toBe(next);
  });

  it('is null past the last milestone', () => {
    expect(nextMilestone(365)).toBeNull();
    expect(nextMilestone(4000)).toBeNull();
  });
});

// ── Properties ────────────────────────────────────────────────────────────────

/** The rule as the spec words it: walk the calendar one day at a time. Slow and obviously right. */
function simulateDayByDay(dates: readonly LocalDate[], today: LocalDate, rules: GameRules) {
  const credited = new Set(dates);
  const sorted = [...credited].sort();
  const first = sorted[0];
  const last = sorted.at(-1);
  let current = 0;
  let best = 0;
  let freezesHeld = 0;
  const frozenDates: LocalDate[] = [];
  const milestoneHits: { milestone: number; date: LocalDate }[] = [];

  if (first !== undefined && last !== undefined) {
    const yesterday = addDays(today, -1);
    const end = last > yesterday ? last : yesterday;
    for (let date = first; date <= end; date = addDays(date, 1)) {
      if (credited.has(date)) {
        current += 1;
        best = Math.max(best, current);
        if (rules.streak.milestones.includes(current)) {
          milestoneHits.push({ milestone: current, date });
          freezesHeld = Math.min(
            rules.streak.maxFreezesHeld,
            freezesHeld + rules.streak.freezesPerMilestone,
          );
        }
      } else if (date < today && current > 0) {
        if (freezesHeld > 0) {
          freezesHeld -= 1;
          frozenDates.push(date);
        } else {
          current = 0;
        }
      }
    }
  }

  const status =
    current === 0
      ? 'inactive'
      : last !== undefined && last >= today
        ? 'lit'
        : frozenDates.includes(addDays(today, -1))
          ? 'frozen'
          : 'at_risk';

  return {
    current,
    best,
    freezesHeld,
    status,
    lastCreditedDate: last ?? null,
    frozenDates,
    milestoneHits,
  };
}

// Two shapes of history: scattered days, and long runs with the odd gap (where freezes matter).
const scatteredDays = fc.array(fc.integer({ min: 1, max: 60 }), { maxLength: 40 });
const mostlyPlayedDays = fc
  .array(fc.integer({ min: 0, max: 9 }), { maxLength: 90 })
  .map((rolls) => rolls.flatMap((roll, index) => (roll < 8 ? [index + 1] : [])));
const creditedDays = fc.oneof(scatteredDays, mostlyPlayedDays).map((ns) => ns.map(day));
const today = fc.integer({ min: -3, max: 100 }).map(day);
const rules = fc
  .record({
    maxFreezesHeld: fc.integer({ min: 0, max: 3 }),
    freezesPerMilestone: fc.integer({ min: 1, max: 2 }),
    milestones: fc.uniqueArray(fc.integer({ min: 1, max: 40 }), { maxLength: 6 }),
  })
  .map(withStreakRules);

describe('deriveStreak, for any history', () => {
  it('agrees with a day-by-day walk of the calendar', () => {
    fc.assert(
      fc.property(creditedDays, today, rules, (dates, today, rules) => {
        expect(deriveStreak(dates, today, rules)).toEqual(simulateDayByDay(dates, today, rules));
      }),
      { numRuns: 500 },
    );
  });

  it('keeps its numbers inside their bounds', () => {
    fc.assert(
      fc.property(creditedDays, today, rules, (dates, today, rules) => {
        const state = deriveStreak(dates, today, rules);
        const distinct = new Set(dates);

        expect(state.freezesHeld).toBeGreaterThanOrEqual(0);
        expect(state.freezesHeld).toBeLessThanOrEqual(rules.streak.maxFreezesHeld);
        expect(state.best).toBeGreaterThanOrEqual(state.current);
        expect(state.current).toBeLessThanOrEqual(distinct.size);
        expect(state.frozenDates.some((date) => distinct.has(date))).toBe(false);
        expect(state.frozenDates).toEqual([...state.frozenDates].sort());
      }),
    );
  });

  it('gives the same answer whatever order the dates arrive in, and however often', () => {
    const shuffled = creditedDays.chain((dates) =>
      fc.tuple(fc.constant(dates), fc.shuffledSubarray(dates, { minLength: dates.length })),
    );
    fc.assert(
      fc.property(shuffled, today, rules, ([dates, reordered], today, rules) => {
        const expected = deriveStreak(dates, today, rules);
        expect(deriveStreak(reordered, today, rules)).toEqual(expected);
        expect(deriveStreak([...reordered, ...dates], today, rules)).toEqual(expected);
      }),
    );
  });
});
