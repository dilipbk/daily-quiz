import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, localDateOf, type LocalDate } from '../src/local-date.ts';
import { deriveStreak, streakFromCompletions, type Completion } from '../src/streak.ts';
import { allZones, dateByOffset, dayBounds, offsetChanges2026 } from './support/zones.ts';

// ENG-03's done-when line: property tests cover DST changes and time-zone hops, and the
// order in which completions arrive can't change a streak.

const HOUR_MS = 3_600_000;
const at = (iso: string): number => Date.parse(iso);

const zone = fc.constantFrom(...allZones);

// A month of play, each session in a zone of its own: the worst traveller imaginable.
// March 2026 holds the DST starts of North America and Europe.
const completion: fc.Arbitrary<Completion> = fc.record({
  completedAt: fc.integer({ min: Date.UTC(2026, 2, 1), max: Date.UTC(2026, 3, 1) }),
  timeZone: zone,
});
const completions = fc.array(completion, { maxLength: 40 });
const now = fc.record({
  instant: fc.integer({ min: Date.UTC(2026, 2, 1), max: Date.UTC(2026, 3, 10) }),
  timeZone: zone,
});

describe('arrival order', () => {
  it('cannot change a streak: any order and any number of retries give the same state', () => {
    const arrivals = completions.chain((sent) =>
      fc.tuple(
        fc.constant(sent),
        fc.shuffledSubarray(sent, { minLength: sent.length }),
        fc.subarray(sent),
      ),
    );
    fc.assert(
      fc.property(arrivals, now, ([sent, reordered, retried], now) => {
        const expected = streakFromCompletions(sent, now);
        expect(streakFromCompletions(reordered, now)).toEqual(expected);
        expect(streakFromCompletions([...retried, ...reordered, ...retried], now)).toEqual(
          expected,
        );
      }),
      { numRuns: 300 },
    );
  });

  it('cannot change a streak kept as a ledger of credited dates (roadmap §4.3 item 4)', () => {
    const arrivals = completions.chain((sent) =>
      fc.tuple(fc.constant(sent), fc.shuffledSubarray(sent, { minLength: sent.length })),
    );
    fc.assert(
      fc.property(arrivals, now, ([sent, reordered], now) => {
        // The server's side: one row per player and local date, inserted as completions arrive.
        const ledger = new Set<LocalDate>();
        for (const { completedAt, timeZone } of reordered) {
          ledger.add(localDateOf(completedAt, timeZone));
        }
        const today = localDateOf(now.instant, now.timeZone);
        expect(deriveStreak(ledger, today)).toEqual(streakFromCompletions(sent, now));
      }),
      { numRuns: 300 },
    );
  });
});

describe('DST and other changes of clocks (STK-03)', () => {
  /** One session on each of the seven local days around a change, at a chosen moment of each day. */
  const weekAround = (
    change: { zone: string; date: LocalDate },
    momentOfDay: (dayIndex: number) => number,
  ): Completion[] =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const { first, last } = dayBounds(addDays(change.date, dayIndex - 3), change.zone);
      const completedAt = first + Math.round(momentOfDay(dayIndex) * (last - first));
      return { completedAt, timeZone: change.zone };
    });

  const streakAfter = (sessions: Completion[]) => {
    const latest = sessions.reduce((a, b) => (a.completedAt >= b.completedAt ? a : b));
    return streakFromCompletions(sessions, {
      instant: latest.completedAt,
      timeZone: latest.timeZone,
    });
  };

  it('finds the clock changes of 2026 to test against', () => {
    const changes = offsetChanges2026();
    expect(changes.length).toBeGreaterThan(200);
    expect(changes).toContainEqual({ zone: 'America/New_York', date: '2026-03-08' });
    expect(changes).toContainEqual({ zone: 'Europe/London', date: '2026-10-25' });
    expect(changes).toContainEqual({ zone: 'Australia/Lord_Howe', date: '2026-10-04' });
  });

  it('keeps a streak through every clock change of 2026, at any moment of each day', () => {
    const momentsOfDay = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
      minLength: 7,
      maxLength: 7,
    });
    fc.assert(
      fc.property(fc.constantFrom(...offsetChanges2026()), momentsOfDay, (change, moments) => {
        const state = streakAfter(weekAround(change, (dayIndex) => moments[dayIndex] ?? 0));
        expect(state).toMatchObject({ current: 7, status: 'lit', frozenDates: [] });
      }),
      { numRuns: 300 },
    );
  });

  it.each([
    ['first', 0],
    ['last', 1],
  ])(
    'keeps a streak through every clock change of 2026, played in the %s millisecond of each day',
    (_, moment) => {
      for (const change of offsetChanges2026()) {
        const state = streakAfter(weekAround(change, () => moment));
        expect(state, `${change.zone} ${change.date}`).toMatchObject({
          current: 7,
          frozenDates: [],
        });
      }
    },
  );

  it('never skips a local day for a player who plays at least every 20 hours', () => {
    const start = fc.integer({ min: Date.UTC(2026, 0, 1), max: Date.UTC(2026, 11, 1) });
    const gaps = fc.array(fc.integer({ min: 60_000, max: 20 * HOUR_MS }), {
      minLength: 1,
      maxLength: 30,
    });
    fc.assert(
      fc.property(zone, start, gaps, (zone, start, gaps) => {
        let instant = start;
        const sessions: Completion[] = [{ completedAt: start, timeZone: zone }];
        for (const gap of gaps) {
          instant += gap;
          sessions.push({ completedAt: instant, timeZone: zone });
        }
        const state = streakFromCompletions(sessions, { instant, timeZone: zone });
        const daysPlayed = daysBetween(dateByOffset(start, zone), dateByOffset(instant, zone)) + 1;
        expect(state.current).toBe(daysPlayed);
        expect(state.frozenDates).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });
});

describe('a calendar day a zone skipped (ADR 0003)', () => {
  it('counts as a missed day: Apia had no 30 December 2011', () => {
    // Samoa crossed the date line. These four sessions are exactly 24 hours apart.
    const sessions: Completion[] = ['12-28', '12-29', '12-30', '12-31'].map((utcDay) => ({
      completedAt: at(`2011-${utcDay}T22:00:00Z`),
      timeZone: 'Pacific/Apia',
    }));
    const dates = sessions.map(({ completedAt, timeZone }) => localDateOf(completedAt, timeZone));
    expect(dates).toEqual(['2011-12-28', '2011-12-29', '2011-12-31', '2012-01-01']);

    const newYearsDay = { instant: at('2011-12-31T22:00:00Z'), timeZone: 'Pacific/Apia' };
    expect(streakFromCompletions(sessions, newYearsDay)).toMatchObject({ current: 2, best: 2 });
  });
});

describe('time-zone hops (STK-03, ADR 0003)', () => {
  it('credits each session to its own local date, whatever zones the others used', () => {
    fc.assert(
      fc.property(completions, now, (sessions, now) => {
        const ownDates = sessions.map(({ completedAt, timeZone }) =>
          localDateOf(completedAt, timeZone),
        );
        const today = localDateOf(now.instant, now.timeZone);
        expect(streakFromCompletions(sessions, now)).toEqual(deriveStreak(ownDates, today));
      }),
      { numRuns: 300 },
    );
  });

  it('counts every day of a trip with a layover: Los Angeles, London, Tokyo', () => {
    const sessions: Completion[] = [
      { completedAt: at('2026-03-02T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Mon 08:00
      { completedAt: at('2026-03-03T09:00:00Z'), timeZone: 'Europe/London' }, // Tue 09:00
      { completedAt: at('2026-03-03T22:00:00Z'), timeZone: 'Asia/Tokyo' }, // Wed 07:00
      { completedAt: at('2026-03-04T23:00:00Z'), timeZone: 'Asia/Tokyo' }, // Thu 08:00
    ];
    const thursdayInTokyo = { instant: at('2026-03-04T23:00:00Z'), timeZone: 'Asia/Tokyo' };

    expect(streakFromCompletions(sessions, thursdayInTokyo)).toMatchObject({
      current: 4,
      status: 'lit',
      lastCreditedDate: '2026-03-05',
      frozenDates: [],
    });
    expect(streakFromCompletions([...sessions].reverse(), thursdayInTokyo).current).toBe(4);
  });

  it('counts a calendar date once when a flight west lets the player live it twice', () => {
    const sessions: Completion[] = [
      { completedAt: at('2026-03-01T23:00:00Z'), timeZone: 'Asia/Tokyo' }, // Mon 08:00
      { completedAt: at('2026-03-02T23:00:00Z'), timeZone: 'Asia/Tokyo' }, // Tue 08:00
      { completedAt: at('2026-03-03T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Tue 08:00 again
      { completedAt: at('2026-03-04T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Wed 08:00
    ];
    const wednesdayInLosAngeles = {
      instant: at('2026-03-04T16:00:00Z'),
      timeZone: 'America/Los_Angeles',
    };

    expect(streakFromCompletions(sessions, wednesdayInLosAngeles)).toMatchObject({
      current: 3,
      status: 'lit',
      frozenDates: [],
    });
  });

  it('stays lit, and spends nothing, when today is earlier than the last credited date', () => {
    const sessions: Completion[] = [
      { completedAt: at('2026-03-01T23:00:00Z'), timeZone: 'Asia/Tokyo' }, // Mon 08:00
      { completedAt: at('2026-03-02T23:00:00Z'), timeZone: 'Asia/Tokyo' }, // Tue 08:00
      { completedAt: at('2026-03-03T16:00:00Z'), timeZone: 'Asia/Tokyo' }, // Wed 01:00
    ];
    // Four hours later the player lands in Los Angeles, where it is still Tuesday noon.
    const tuesdayInLosAngeles = {
      instant: at('2026-03-03T20:00:00Z'),
      timeZone: 'America/Los_Angeles',
    };

    expect(streakFromCompletions(sessions, tuesdayInLosAngeles)).toMatchObject({
      current: 3,
      freezesHeld: 1,
      status: 'lit',
      lastCreditedDate: '2026-03-04',
      frozenDates: [],
    });
  });

  it('spends a freeze, not the streak, when a flight east skips a calendar day', () => {
    const sessions: Completion[] = [
      { completedAt: at('2026-03-02T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Mon 08:00
      { completedAt: at('2026-03-03T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Tue 08:00
      { completedAt: at('2026-03-04T16:00:00Z'), timeZone: 'America/Los_Angeles' }, // Wed 08:00
      // Exactly 24 hours later, in Tokyo, it is already Friday 01:00. Thursday never happened.
      { completedAt: at('2026-03-05T16:00:00Z'), timeZone: 'Asia/Tokyo' },
    ];
    const fridayInTokyo = { instant: at('2026-03-05T16:00:00Z'), timeZone: 'Asia/Tokyo' };

    expect(streakFromCompletions(sessions, fridayInTokyo)).toMatchObject({
      current: 4,
      freezesHeld: 0,
      status: 'lit',
      frozenDates: ['2026-03-05'],
    });
  });

  it('refuses a completion whose zone the runtime does not know', () => {
    const sessions = [{ completedAt: at('2026-03-02T16:00:00Z'), timeZone: 'Mars/Olympus' }];
    const now = { instant: at('2026-03-02T16:00:00Z'), timeZone: 'UTC' };
    expect(() => streakFromCompletions(sessions, now)).toThrow(RangeError);
  });
});
