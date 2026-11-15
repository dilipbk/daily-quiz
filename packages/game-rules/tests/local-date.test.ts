import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addDays,
  daysBetween,
  isValidTimeZone,
  localDateOf,
  parseLocalDate,
} from '../src/local-date.ts';
import { allZones } from './support/zones.ts';

const HOUR_MS = 3_600_000;
const at = (iso: string): number => Date.parse(iso);
const utcDate = (instant: number): string => new Date(instant).toISOString().slice(0, 10);

const instant = fc.integer({ min: Date.UTC(2015, 0, 1), max: Date.UTC(2040, 0, 1) });
const zone = fc.constantFrom(...allZones);
const date = fc
  .integer({ min: Date.UTC(1971, 0, 1), max: Date.UTC(2100, 0, 1) })
  .map((t) => parseLocalDate(utcDate(t)));

describe('localDateOf (STK-03)', () => {
  it('moves the day at local midnight when New York springs forward, a 23-hour day', () => {
    const zone = 'America/New_York';
    expect(localDateOf(at('2026-03-08T04:59:59Z'), zone)).toBe('2026-03-07');
    expect(localDateOf(at('2026-03-08T05:00:00Z'), zone)).toBe('2026-03-08');
    expect(localDateOf(at('2026-03-09T03:59:59Z'), zone)).toBe('2026-03-08');
    expect(localDateOf(at('2026-03-09T04:00:00Z'), zone)).toBe('2026-03-09');
  });

  it('moves the day at local midnight when New York falls back, a 25-hour day', () => {
    const zone = 'America/New_York';
    expect(localDateOf(at('2026-11-01T03:59:59Z'), zone)).toBe('2026-10-31');
    expect(localDateOf(at('2026-11-01T04:00:00Z'), zone)).toBe('2026-11-01');
    expect(localDateOf(at('2026-11-02T04:59:59Z'), zone)).toBe('2026-11-01');
    expect(localDateOf(at('2026-11-02T05:00:00Z'), zone)).toBe('2026-11-02');
  });

  it('handles the half-hour DST change on Lord Howe Island, a 23.5-hour day', () => {
    const zone = 'Australia/Lord_Howe';
    expect(localDateOf(at('2026-10-03T13:29:59Z'), zone)).toBe('2026-10-03');
    expect(localDateOf(at('2026-10-03T13:30:00Z'), zone)).toBe('2026-10-04');
    expect(localDateOf(at('2026-10-04T12:59:59Z'), zone)).toBe('2026-10-04');
    expect(localDateOf(at('2026-10-04T13:00:00Z'), zone)).toBe('2026-10-05');
  });

  it('gives three different dates at one instant across the widest offsets', () => {
    const instant = at('2026-06-15T10:30:00Z');
    expect(localDateOf(instant, 'Etc/GMT+12')).toBe('2026-06-14');
    expect(localDateOf(instant, 'Australia/Lord_Howe')).toBe('2026-06-15');
    expect(localDateOf(instant, 'Pacific/Kiritimati')).toBe('2026-06-16');
  });

  it('refuses a zone the runtime does not know', () => {
    expect(() => localDateOf(0, 'Mars/Olympus')).toThrow(RangeError);
    expect(() => localDateOf(0, '')).toThrow(RangeError);
  });

  it('refuses an instant that is not a time a session could complete', () => {
    expect(() => localDateOf(Number.NaN, 'UTC')).toThrow(RangeError);
    expect(() => localDateOf(Number.POSITIVE_INFINITY, 'UTC')).toThrow(RangeError);
    expect(() => localDateOf(-1, 'UTC')).toThrow(RangeError);
    expect(() => localDateOf(at('9999-12-31T00:00:00Z'), 'UTC')).toThrow(RangeError);
  });

  it('matches the ISO date in UTC', () => {
    fc.assert(
      fc.property(instant, (t) => {
        expect(localDateOf(t, 'UTC')).toBe(utcDate(t));
      }),
    );
  });

  it('matches the shifted UTC date in every fixed-offset zone', () => {
    fc.assert(
      fc.property(instant, fc.integer({ min: -14, max: 12 }), (t, hoursWest) => {
        // POSIX names carry the opposite sign: Etc/GMT+5 is five hours west of Greenwich.
        const name =
          hoursWest >= 0 ? `Etc/GMT+${String(hoursWest)}` : `Etc/GMT${String(hoursWest)}`;
        expect(localDateOf(t, name)).toBe(utcDate(t - hoursWest * HOUR_MS));
      }),
    );
  });

  it('never goes backwards as time moves forward, in any zone', () => {
    fc.assert(
      fc.property(zone, instant, instant, (zone, a, b) => {
        const [earlier, later] = a <= b ? [a, b] : [b, a];
        expect(localDateOf(earlier, zone) <= localDateOf(later, zone)).toBe(true);
      }),
    );
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA zones and refuses anything else', () => {
    expect(isValidTimeZone('Asia/Kathmandu')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('parseLocalDate', () => {
  it('accepts a real calendar date', () => {
    expect(parseLocalDate('2024-02-29')).toBe('2024-02-29');
  });

  it.each([
    '2026-02-30',
    '2025-02-29',
    '2026-2-3',
    '2026-13-01',
    '20260203',
    '',
    '2026-02-03T00:00',
  ])('refuses %j', (value) => {
    expect(() => parseLocalDate(value)).toThrow(RangeError);
  });
});

describe('calendar arithmetic', () => {
  it('steps over month ends and leap days', () => {
    expect(addDays(parseLocalDate('2024-02-28'), 2)).toBe('2024-03-01');
    expect(addDays(parseLocalDate('2025-02-28'), 1)).toBe('2025-03-01');
    expect(addDays(parseLocalDate('2026-01-01'), -1)).toBe('2025-12-31');
  });

  it('counts calendar days between two dates', () => {
    expect(daysBetween(parseLocalDate('2025-12-31'), parseLocalDate('2026-01-01'))).toBe(1);
    expect(daysBetween(parseLocalDate('2026-03-01'), parseLocalDate('2026-02-01'))).toBe(-28);
    expect(daysBetween(parseLocalDate('2026-03-08'), parseLocalDate('2026-03-08'))).toBe(0);
  });

  it('refuses a step that is not a whole number of days', () => {
    expect(() => addDays(parseLocalDate('2026-01-01'), 0.5)).toThrow(RangeError);
    expect(() => addDays(parseLocalDate('2026-01-01'), Number.NaN)).toThrow(RangeError);
  });

  it('adds and counts days consistently', () => {
    fc.assert(
      fc.property(date, fc.integer({ min: -5000, max: 5000 }), (day, n) => {
        expect(daysBetween(day, addDays(day, n))).toBe(n);
        expect(addDays(addDays(day, n), -n)).toBe(day);
      }),
    );
  });
});
