import { isHttpsUrl } from '@repo/content-blocks';
import * as z from 'zod';

// The values every contract is built from (spec §19.2). Nothing here transforms what it reads,
// with one exception: a number in a query string arrives as text and is read as a number.

/** A whole number as a URL spells it: digits, with a minus sign if it needs one. Nothing else. */
const DECIMAL = /^(?:0|-?[1-9][0-9]{0,8})$/;

/**
 * A whole number in a query string. It reads the plain decimal spelling and a number, and
 * nothing else: not `0x10`, `1e1`, ` 5 `, `true` or a list, all of which a looser reading
 * would turn into a number.
 */
export function queryIntegerSchema(min: number, max: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && DECIMAL.test(value) ? Number(value) : value),
    z.int().min(min).max(max),
  );
}

/** The id of a player, a session, a question, a quiz, a device or an asset: opaque and URL-safe. */
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/** The name of a domain or a topic in a URL: lowercase words joined by single hyphens. */
export const slugSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * An instant, in ISO 8601, in UTC, to the millisecond and written with a `Z`:
 * `2026-11-21T18:03:11.123Z`, which is what `toISOString()` gives. One spelling for every
 * instant, so two timestamps compare as strings in the order they happened.
 */
export const isoTimestampSchema = z.iso.datetime({ precision: 3 });

/** A calendar date that exists, `YYYY-MM-DD`. It names a day, not an instant. */
export const localDateSchema = z.iso.date();

/**
 * An IANA time-zone id, such as `Asia/Kathmandu`. Checked for its spelling only: whether a zone
 * exists depends on the reader's time-zone data, and the server's can be older than a phone's
 * (ADR 0005). Wherever a zone decides a date, `utcOffsetMinutesSchema` travels with it.
 */
export const timeZoneSchema = z
  .string()
  .max(64)
  .regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/);

/**
 * Local time minus UTC, in minutes, east of Greenwich positive: Kathmandu is +345, Los Angeles
 * in winter is −480. It is the negative of JavaScript's `getTimezoneOffset()`. The bounds are the
 * widest offsets in use, UTC−12:00 and UTC+14:00.
 */
export const utcOffsetMinutesSchema = z.int().min(-720).max(840);

/** A BCP 47 language tag, such as `en` or `pt-BR`. */
export const localeSchema = z
  .string()
  .max(35)
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/);

/** An app version as the stores show it: `major.minor.patch`. */
export const appVersionSchema = z.string().regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/);

export const platformSchema = z.enum(['ios', 'android', 'web']);

/** An address the device may fetch or open: the one https spelling content links use (ADR 0008). */
export const httpsUrlSchema = z
  .string()
  .max(2048)
  .refine(isHttpsUrl, { error: 'Expected an https:// address of a named host, with no port.' });

/** A count of things: a whole number, never negative. */
export const countSchema = z.int().min(0).max(1_000_000_000);

/** The most items one page holds, and the most a caller may ask for. */
export const maxPageSize = 50;

/** Where the next page starts. Opaque: only the server reads it. */
export const cursorSchema = z.string().min(1).max(512);

/** The two query parameters of every list (spec §19.2). Spread them into a list's query schema. */
export const pageQueryShape = {
  cursor: cursorSchema.optional(),
  limit: queryIntegerSchema(1, maxPageSize).optional(),
};

/** One page of a list: its items, and the cursor of the next page or `null` on the last. */
export function pageOf<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item).max(maxPageSize),
    nextCursor: cursorSchema.nullable(),
  });
}

export type Platform = z.infer<typeof platformSchema>;
