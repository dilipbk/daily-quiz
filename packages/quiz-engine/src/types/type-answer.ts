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
// leniency has a stop: short answers get no typos, a number must match in its digits, its
// separator and its sign, a Roman numeral must match letter for letter, and a near-miss the
// author listed is wrong however it is reached.

// Hard caps. They bound the work one answer can cause on the completion endpoint, where the
// text comes from the player's device, so they are constants and not tunables.

/**
 * The longest typed answer, in UTF-16 units: the size the text has in memory, and what
 * `text.length` counts. Public, so the app can cap its answer field at the same number.
 */
export const maxResponseLength = 256;
/** The longest accepted or rejected entry, or unit, in characters. */
const maxEntryLength = 120;
/** The most accepted entries, rejected entries or units one key holds. */
const maxEntries = 20;
/** The most typos any config or question can allow. */
const maxTypoEdits = 3;

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
  /**
   * Lowers the typos allowed for this question. It can't raise them: grading takes the lower of
   * this and what the tunables allow, and a value above the hard cap is refused here.
   */
  maxTypos: z.int().nonnegative().max(maxTypoEdits).optional(),
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

/** `typedText` without one listed unit, taken from its end or, failing that, from its start. */
function withoutUnit(typedText: string, units: readonly string[]): string {
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

const SENTENCE_END = '.!?,;:';

/**
 * `typedText` without the sentence punctuation after it, and the spaces around that. A phone
 * types ". " when the space bar is pressed twice, so "5." is the answer 5 with a full stop, and
 * not something other than a number. A walk back from the end: the work is the text's length.
 */
function withoutSentenceEnd(typedText: string): string {
  let end = typedText.length;
  for (; end > 0; end -= 1) {
    const last = typedText.charAt(end - 1);
    if (!SENTENCE_END.includes(last) && last.trim() !== '') break;
  }
  return typedText.slice(0, end);
}

/**
 * Every number the typed text can mean on a key with these units: as it was typed, and where
 * that reads as no number, without the sentence punctuation after it. A listed unit is removed
 * either way, so "71%." is read and so is "5 in." where the unit is listed with its full stop.
 */
function numberReadingsOf(text: string, units: readonly string[]): readonly number[] {
  const typedText = plain(text);
  const asTyped = parseNumberReadings(withoutUnit(typedText, units));
  return asTyped.length > 0
    ? asTyped
    : parseNumberReadings(withoutUnit(withoutSentenceEnd(typedText), units));
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

// One pass, with nothing optional inside the repetition. In normalized text a dot or comma stands
// only between two digits and a minus only in front of one, so this finds every digit.
const NUMBER = /-?[0-9]+(?:[.,][0-9]+)*/g;

/**
 * The numbers in a normalized text, in order: each with its digits, the separators inside it
 * and its sign. A comma and a point stand for each other, so "12,5" is the number "12.5" is.
 */
const numbersOf = (text: string): string => (text.match(NUMBER) ?? []).join(' ').replace(/,/g, '.');

// A valid Roman numeral in lower case, as normalization leaves it. Anchored at both ends, with
// every repetition bounded.
const ROMAN_NUMERAL = /^m{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/;

/** The Roman numerals in a normalized text, in order. Only a whole word is one (reading R6a). */
const romanNumeralsOf = (text: string): string =>
  text
    .split(' ')
    .filter((word) => word !== '' && ROMAN_NUMERAL.test(word))
    .join(' ');

/**
 * What no typo may touch: the numbers in a text and its Roman numerals. Two texts with the same
 * stops differ, if they differ at all, somewhere else.
 */
const stopsOf = (text: string): string => `${numbersOf(text)}/${romanNumeralsOf(text)}`;

const HAS_DIGIT = /[0-9]/;

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

  // On a number question, text with a digit in it is judged as a number: right when a reading of
  // it is close enough, and wrong when it reads as another number ("314" is no typo of "3.14")
  // or as none ("71 km" where no unit is listed). No typo is forgiven on the way.
  if (key.numeric !== undefined) {
    const { numeric } = key;
    const units = numeric.units ?? [];
    const readings = numberReadingsOf(text, units);
    if (readings.some((reading) => isWithinTolerance(reading, numeric))) return correct();

    if (HAS_DIGIT.test(input)) {
      // One exception, so that an entry the author listed accepts at least itself: text that
      // reads as no number is right when it equals, once normalized, an accepted entry that
      // reads as none either, such as "1.5 million". An entry that is a number is left to the
      // rule above, or "(5)" would equal "5" with its brackets normalized away.
      const isListedAsText =
        readings.length === 0 &&
        key.accepted.some(
          (entry) => normalize(entry) === input && numberReadingsOf(entry, units).length === 0,
        );
      return isListedAsText ? correct() : incorrect();
    }
  }

  const accepted = key.accepted.map(normalize).filter((entry) => entry !== '');
  if (accepted.includes(input)) return correct();

  // A typo: within the edits its length allows, with every number and Roman numeral as in the
  // answer, and strictly closer to the answer than to anything rejected. Each distance is cut
  // off at a few edits, so its work is bounded by the lengths the schemas cap.
  const inputStops = stopsOf(input);
  const isTypoOf = (entry: string): boolean => {
    const allowed = allowedTypos(codePointLength(entry), tunables.typoThresholds, key.maxTypos);
    if (!(allowed > 0) || stopsOf(entry) !== inputStops) return false;

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
