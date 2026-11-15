import * as z from 'zod';
import { correct, defineQuestionType, incorrect } from '../core/module.ts';
import type { Grade, QuestionIssue } from '../core/module.ts';
import { editDistance } from '../text/edit-distance.ts';
import { normalizeAnswerText } from '../text/normalize.ts';
import type { ArticlesByLanguage } from '../text/normalize.ts';
import { parseNumberReadings } from '../text/number.ts';

// A typed answer (spec §7.4, QT-03): compared after normalization with every accepted alias, read
// as a number where the key holds one, and forgiven a typo or two where the answer is long enough
// to tell a slip from another answer. A wrong fact costs more than a missing quiz, so each
// leniency has a stop: short answers get no typos, digits must match, and a near-miss the author
// listed is wrong however it is reached.

// Hard caps. They bound the work one answer can cause on the completion endpoint, where the
// text comes from the player's device, so they are constants and not tunables.

/** The longest typed answer, in UTF-16 units: the size the text has in memory. */
export const maxResponseLength = 256;
/** The longest accepted or rejected entry, or unit, in characters. */
export const maxEntryLength = 120;
/** The most accepted entries, rejected entries or units one key holds. */
export const maxEntries = 20;
/** The most typos any config or question can allow. */
export const maxTypoEdits = 3;

// Tunables

export interface TypeAnswerTunables {
  /** Leading articles to ignore, by the primary language subtag of the question's locale. */
  readonly articles: ArticlesByLanguage;
  /**
   * How many typos an answer of at least `minLength` characters is allowed, shortest first. The
   * last entry that applies decides; an answer shorter than every entry is allowed none. An
   * empty list switches typo tolerance off.
   */
  readonly typoThresholds: readonly { readonly minLength: number; readonly maxEdits: number }[];
}

/** Text as it is compared when no article is dropped: what the schemas can know without a locale. */
const compared = (text: string): string => normalizeAnswerText(text, '', {});

const articleSchema = z
  .string()
  .min(1)
  .max(16)
  .refine((article) => !/\s/.test(article) && compared(article) === article, {
    error:
      'Write an article as one word, the way it reads once normalized: lower case, with no accents or punctuation. Anything else never matches.',
  });

const thresholdSchema = z
  .strictObject({
    minLength: z.int().positive(),
    maxEdits: z.int().min(0).max(maxTypoEdits),
  })
  .refine((threshold) => threshold.maxEdits < threshold.minLength, {
    error: 'Allow fewer typos than the answer has characters, or any short answer is correct.',
  });

const inAscendingOrder = (thresholds: readonly { readonly minLength: number }[]): boolean =>
  thresholds.every((threshold, index) => {
    const before = thresholds[index - 1];
    return before === undefined || before.minLength < threshold.minLength;
  });

export const typeAnswerTunablesSchema: z.ZodType<TypeAnswerTunables> = z.strictObject({
  // A lower-case primary subtag: the form the locale is reduced to before the lookup.
  articles: z.record(z.string().regex(/^[a-z]{2,8}$/), z.array(articleSchema).max(16)),
  typoThresholds: z
    .array(thresholdSchema)
    .max(8)
    .refine(inAscendingOrder, { error: 'List the thresholds shortest first, each length once.' }),
});

/** The values of reading R6 and of the MVP's one content language (L10N-11), as data. */
export const specTypeAnswerTunables: TypeAnswerTunables = Object.freeze({
  articles: Object.freeze({ en: Object.freeze(['the', 'a', 'an']) }),
  typoThresholds: Object.freeze([
    Object.freeze({ minLength: 5, maxEdits: 1 }),
    Object.freeze({ minLength: 9, maxEdits: 2 }),
  ]),
});

// Schemas

const entrySchema = z.string().min(1).max(maxEntryLength);

const numericSchema = z.strictObject({
  value: z.number(),
  /** Inclusive: an answer within `tolerance` of `value` on either side is correct. */
  tolerance: z.number().nonnegative(),
  /** Ways of writing the unit that may be typed with the number, before or after it. */
  units: z.array(entrySchema).max(maxEntries).optional(),
});

const keySchema = z.strictObject({
  /** Every answer that is right. The first is the one shown on reveal. */
  accepted: z.array(entrySchema).min(1).max(maxEntries),
  /** Near-misses that are wrong: other real answers one slip away from an accepted one. */
  rejected: z.array(entrySchema).max(maxEntries).optional(),
  /** Lowers the typos allowed for this question. It can't raise them above the tunables'. */
  maxTypos: z.int().nonnegative().optional(),
  /** Present exactly when the payload's format is 'number'. */
  numeric: numericSchema.optional(),
});

// zod measures a string in code points, and this cap is in UTF-16 units, so it is a check of its own.
const responseTextSchema = z.string().refine((text) => text.length <= maxResponseLength, {
  error: `A typed answer holds at most ${String(maxResponseLength)} UTF-16 units.`,
});

type TypeAnswerKey = z.infer<typeof keySchema>;

function checkTypeAnswer(question: {
  readonly payload: { readonly format: 'text' | 'number' };
  readonly key: TypeAnswerKey;
}): QuestionIssue[] {
  const { payload, key } = question;
  const issues: QuestionIssue[] = [];

  // The format picks the keyboard, so it has to agree with how the key is graded.
  if (payload.format === 'number' && key.numeric === undefined) {
    issues.push({
      path: ['key', 'numeric'],
      message: 'A number question needs the number it accepts. Add "numeric".',
    });
  }
  if (payload.format === 'text' && key.numeric !== undefined) {
    issues.push({
      path: ['payload', 'format'],
      message: 'This key holds a number. Set the format to "number", or remove "numeric".',
    });
  }

  const accepted = key.accepted.map(compared);
  accepted.forEach((entry, index) => {
    if (entry === '') {
      issues.push({
        path: ['key', 'accepted', index],
        message:
          'Nothing is left of this answer once punctuation and spaces are ignored, so nothing a player types can match it.',
      });
    }
  });
  (key.rejected ?? []).forEach((entry, index) => {
    const rejected = compared(entry);
    if (rejected !== '' && accepted.includes(rejected)) {
      issues.push({
        path: ['key', 'rejected', index],
        message:
          'This reads the same as an accepted answer. An answer is accepted or rejected, not both.',
      });
    }
  });
  return issues;
}

// Grading

/** Lower case, in compatibility form and trimmed: how a unit and the text around a number are matched. */
const plain = (text: string): string => text.normalize('NFKC').trim().toLowerCase();

/** The typed text without one listed unit, taken from its end or, failing that, from its start. */
function withoutUnit(text: string, units: readonly string[]): string {
  const typedText = plain(text);
  // The longest first, so "°c" goes whole where "c" is listed too.
  const longestFirst = units
    .map(plain)
    .filter((unit) => unit !== '')
    .sort((a, b) => b.length - a.length);

  const ending = longestFirst.find((unit) => typedText.endsWith(unit));
  if (ending !== undefined) return typedText.slice(0, typedText.length - ending.length);

  const beginning = longestFirst.find((unit) => typedText.startsWith(unit));
  return beginning === undefined ? typedText : typedText.slice(beginning.length);
}

/** Inclusive, with a guard against binary rounding: 0.4 is within 0.1 of 0.3. */
const isWithinTolerance = (
  reading: number,
  numeric: { readonly value: number; readonly tolerance: number },
): boolean =>
  Math.abs(reading - numeric.value) <=
  numeric.tolerance + 1e-9 * Math.max(1, Math.abs(numeric.value));

/** The typos an answer of `length` characters is allowed: never above the hard cap. */
function allowedTypos(
  length: number,
  thresholds: TypeAnswerTunables['typoThresholds'],
  maxTypos: number | undefined,
): number {
  let allowed = 0;
  for (const threshold of thresholds) {
    if (threshold.minLength <= length) allowed = threshold.maxEdits;
  }
  return Math.min(allowed, maxTypos ?? maxTypoEdits, maxTypoEdits);
}

const digitsOf = (text: string): string => text.replace(/[^0-9]/g, '');

const codePointLength = (text: string): number => Array.from(text).length;

function gradeTypedAnswer(
  key: TypeAnswerKey,
  text: string,
  locale: string,
  tunables: TypeAnswerTunables,
): Grade {
  const normalize = (entry: string): string =>
    normalizeAnswerText(entry, locale, tunables.articles);

  // Submitted with nothing in it: an answer, and a wrong one. Nothing below matches an empty text.
  const input = normalize(text);
  if (input === '') return incorrect();

  // A near-miss the author listed is wrong before anything can forgive it.
  const rejected = (key.rejected ?? []).map(normalize).filter((entry) => entry !== '');
  if (rejected.includes(input)) return incorrect();

  // A typed number is judged as a number and never as text: "314" is not a typo of "3.14".
  if (key.numeric !== undefined) {
    const { numeric } = key;
    const readings = parseNumberReadings(withoutUnit(text, numeric.units ?? []));
    if (readings.length > 0) {
      return readings.some((reading) => isWithinTolerance(reading, numeric))
        ? correct()
        : incorrect();
    }
  }

  const accepted = key.accepted.map(normalize).filter((entry) => entry !== '');
  if (accepted.includes(input)) return correct();

  // A typo: within the edits its length allows, with every digit as in the answer, and strictly
  // closer to the answer than to anything rejected. Each distance is cut off at a few edits, so
  // its work is bounded by the lengths the schemas cap.
  const inputDigits = digitsOf(input);
  const isTypoOf = (entry: string): boolean => {
    const allowed = allowedTypos(codePointLength(entry), tunables.typoThresholds, key.maxTypos);
    if (!(allowed > 0) || digitsOf(entry) !== inputDigits) return false;

    const distance = editDistance(input, entry, allowed);
    return (
      distance <= allowed &&
      !rejected.some((nearMiss) => editDistance(input, nearMiss, distance) <= distance)
    );
  };
  return accepted.some(isTypoOf) ? correct() : incorrect();
}

export const typeAnswer = defineQuestionType({
  type: 'type_answer',
  timeClass: 'constructed',
  /** Which keyboard to show. The answer itself is typed as free text either way. */
  payloadSchema: z.strictObject({ format: z.enum(['text', 'number']) }),
  keySchema,
  responseSchema: z.strictObject({ text: responseTextSchema }),
  tunablesSchema: typeAnswerTunablesSchema,
  check: checkTypeAnswer,
  grade: ({ key }, response, { locale, tunables }) =>
    gradeTypedAnswer(key, response.text, locale, tunables),
});
