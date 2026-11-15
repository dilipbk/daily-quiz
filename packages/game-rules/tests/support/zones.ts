import { addDays, localDateOf, type LocalDate } from '../../src/local-date.ts';

// Test-only helpers. They use `Intl.supportedValuesOf` and `formatToParts`, which Node has
// and Hermes doesn't document; nothing under `src/` may use either.

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Every IANA zone this runtime knows. */
export const allZones: readonly string[] = Intl.supportedValuesOf('timeZone');

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

/** The zone's offset from UTC at an instant, in minutes east of Greenwich. */
export function offsetMinutes(instant: number, zone: string): number {
  let formatter = offsetFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
    offsetFormatters.set(zone, formatter);
  }
  const name = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
  const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name ?? '');
  if (!match) throw new Error(`Unreadable offset ${String(name)} for ${zone}`);
  const [, sign, hours, minutes] = match;
  if (sign === undefined) return 0;
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes));
}

/** The smallest instant in `(low, high]` for which `reached` holds; `reached` must be monotonic. */
function firstInstant(low: number, high: number, reached: (instant: number) => boolean): number {
  let before = low;
  let at = high;
  while (at - before > 1) {
    const middle = before + Math.floor((at - before) / 2);
    if (reached(middle)) at = middle;
    else before = middle;
  }
  return at;
}

export interface OffsetChange {
  zone: string;
  /** The local date on which the clocks changed. */
  date: LocalDate;
}

function offsetChangesIn(zone: string, year: number): OffsetChange[] {
  const changes: OffsetChange[] = [];
  const end = Date.UTC(year + 1, 0, 1);
  for (let day = Date.UTC(year, 0, 1); day < end; day += DAY_MS) {
    const before = offsetMinutes(day, zone);
    if (offsetMinutes(day + DAY_MS, zone) === before) continue;
    const change = firstInstant(day, day + DAY_MS, (t) => offsetMinutes(t, zone) !== before);
    changes.push({ zone, date: localDateOf(change, zone) });
  }
  return changes;
}

let changes2026: readonly OffsetChange[] | undefined;

/**
 * Every change of UTC offset in 2026, in every zone: DST starts and ends, and rule changes.
 * Worked out on first use, because scanning every zone takes most of a second.
 */
export function offsetChanges2026(): readonly OffsetChange[] {
  changes2026 ??= allZones.flatMap((zone) => offsetChangesIn(zone, 2026));
  return changes2026;
}

/** The first and last millisecond of a local calendar day in a zone. */
export function dayBounds(date: LocalDate, zone: string): { first: number; last: number } {
  const startOf = (day: LocalDate): number => {
    const utcMidnight = Date.parse(`${day}T00:00:00Z`);
    // Offsets run from UTC−12 to UTC+14, so the local midnight lies inside this window.
    return firstInstant(
      utcMidnight - 15 * HOUR_MS,
      utcMidnight + 13 * HOUR_MS,
      (t) => localDateOf(t, zone) >= day,
    );
  };
  return { first: startOf(date), last: startOf(addDays(date, 1)) - 1 };
}
