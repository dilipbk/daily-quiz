/**
 * A calendar date written `YYYY-MM-DD`. Dates in this form sort correctly as strings.
 * Make one with `localDateOf` or `parseLocalDate`.
 */
export type LocalDate = string & { readonly __localDate: never };

const DAY_MS = 86_400_000;

// Instants outside 1970-01-01 to 9999-12-30 are not times a session could complete,
// and beyond year 9999 a date no longer fits `YYYY-MM-DD`. This is 9999-12-31T00:00:00Z.
const END_OF_RANGE_MS = 253_402_214_400_000;

// A caller can spell one zone many ways, so the cache is emptied rather than left to grow.
const MAX_CACHED_FORMATTERS = 1024;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    if (timeZone === '') throw new RangeError('empty');
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new RangeError(`Unknown time zone: ${JSON.stringify(timeZone)}`);
  }

  if (formatters.size >= MAX_CACHED_FORMATTERS) formatters.clear();
  formatters.set(timeZone, formatter);
  return formatter;
}

/** Whether the runtime knows this IANA time zone. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date in `timeZone` at the instant `instantMs` (milliseconds since the epoch).
 *
 * Only `Intl.DateTimeFormat.prototype.format` is used, because it is the one date API that
 * Node and Hermes on both platforms all document (ADR 0005). A DST change needs no special
 * case: the zone's rules decide the date, and no day is assumed to last 24 hours.
 */
export function localDateOf(instantMs: number, timeZone: string): LocalDate {
  if (!Number.isFinite(instantMs) || instantMs < 0 || instantMs >= END_OF_RANGE_MS) {
    throw new RangeError(`Instant out of range: ${String(instantMs)}`);
  }
  // en-US with these options prints month/day/year in ASCII digits on every runtime.
  const formatted = formatterFor(timeZone).format(instantMs);
  const [month, day, year, ...rest] = formatted.match(/\d+/g) ?? [];
  if (month === undefined || day === undefined || year === undefined || rest.length > 0) {
    throw new Error(`Unreadable date ${JSON.stringify(formatted)} for ${timeZone}`);
  }
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` as LocalDate;
}

function toEpochDay(date: LocalDate): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function fromEpochDay(epochDay: number): LocalDate {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10) as LocalDate;
}

/** Reads a `YYYY-MM-DD` string, refusing anything that is not a real calendar date. */
export function parseLocalDate(value: string): LocalDate {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const epochDay = toEpochDay(value as LocalDate);
    // `Date.UTC` rolls 02-30 over into March; a real date survives the round trip unchanged.
    if (Number.isInteger(epochDay) && fromEpochDay(epochDay) === value) return value as LocalDate;
  }
  throw new RangeError(`Not a calendar date: ${JSON.stringify(value)}`);
}

/** The date `days` calendar days after `date` (before it, when negative). */
export function addDays(date: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) throw new RangeError(`Not a whole number of days: ${String(days)}`);
  return fromEpochDay(toEpochDay(date) + days);
}

/** Calendar days from `from` to `to`: 1 for consecutive dates, negative when `to` is earlier. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from);
}
