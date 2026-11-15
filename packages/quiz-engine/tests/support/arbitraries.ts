import fc from 'fast-check';
import { image, text } from '../../src/fixtures/content.ts';
import { imageChoice } from '../../src/types/image-choice.ts';
import { ordering } from '../../src/types/ordering.ts';
import { singleChoice } from '../../src/types/single-choice.ts';
import { trueFalse } from '../../src/types/true-false.ts';
import { typeAnswer } from '../../src/types/type-answer.ts';
import type { TypeKit } from './registry-properties.ts';

// How to draw and answer each MVP question type, for the properties every registry must hold.
// A kit draws only questions the registry's schema accepts, and a response it calls wrong is
// wrong under every locale the properties draw.

type Drawn = Parameters<TypeKit['correctResponse']>[0];

/** Any id the schema takes, with names an object would inherit: an id is never a property name. */
const id = fc.oneof(
  fc.string({ minLength: 1, maxLength: 32 }),
  fc.constantFrom('__proto__', 'constructor', 'toString'),
);

/** A short visible label: what a text option or item says. */
const label = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,15}$/);

const assetId = fc.stringMatching(/^[A-Za-z0-9_-]{1,16}$/);

/** `min` to `max` entries, no two with the same id or the same `shown`. */
const distinctEntries = <Shown>(shown: fc.Arbitrary<Shown>, min: number, max: number) =>
  fc.uniqueArray(fc.record({ id, shown }), {
    minLength: min,
    maxLength: max,
    comparator: (a, b) => a.id === b.id || a.shown === b.shown,
  });

const singleChoiceKit: TypeKit = {
  type: singleChoice.type,
  question: distinctEntries(label, 2, 4).chain((entries) =>
    fc.constantFrom(...entries.map((entry) => entry.id)).map((correctOptionId) => ({
      type: singleChoice.type,
      payload: { options: entries.map((entry) => ({ id: entry.id, content: text(entry.shown) })) },
      key: { correctOptionId },
    })),
  ),
  correctResponse: (question: Drawn) => ({
    optionId: singleChoice.keySchema.parse(question.key).correctOptionId,
  }),
  wrongResponse: (question: Drawn) => {
    const { correctOptionId } = singleChoice.keySchema.parse(question.key);
    const others = singleChoice.payloadSchema
      .parse(question.payload)
      .options.map((option) => option.id)
      .filter((optionId) => optionId !== correctOptionId);
    return fc.constantFrom(...others).map((optionId) => ({ optionId }));
  },
};

const imageChoiceKit: TypeKit = {
  type: imageChoice.type,
  question: distinctEntries(assetId, 2, 4).chain((entries) =>
    fc.constantFrom(...entries.map((entry) => entry.id)).map((correctOptionId) => ({
      type: imageChoice.type,
      payload: {
        options: entries.map((entry) => ({
          id: entry.id,
          image: image(entry.shown, `A picture of ${entry.shown}`),
        })),
      },
      key: { correctOptionId },
    })),
  ),
  correctResponse: (question: Drawn) => ({
    optionId: imageChoice.keySchema.parse(question.key).correctOptionId,
  }),
  wrongResponse: (question: Drawn) => {
    const { correctOptionId } = imageChoice.keySchema.parse(question.key);
    const others = imageChoice.payloadSchema
      .parse(question.payload)
      .options.map((option) => option.id)
      .filter((optionId) => optionId !== correctOptionId);
    return fc.constantFrom(...others).map((optionId) => ({ optionId }));
  },
};

const trueFalseKit: TypeKit = {
  type: trueFalse.type,
  question: fc.boolean().map((value) => ({ type: trueFalse.type, payload: {}, key: { value } })),
  correctResponse: (question: Drawn) => ({ value: trueFalse.keySchema.parse(question.key).value }),
  wrongResponse: (question: Drawn) =>
    fc.constant({ value: !trueFalse.keySchema.parse(question.key).value }),
};

const sameOrder = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** Every arrangement of `values` but `order` itself. */
const arrangementOtherThan = (values: readonly string[], order: readonly string[]) =>
  fc
    .shuffledSubarray([...values], { minLength: values.length })
    .filter((candidate) => !sameOrder(candidate, order));

const orderingKit: TypeKit = {
  type: ordering.type,
  question: distinctEntries(label, 3, 6).chain((entries) => {
    const stored = entries.map((entry) => entry.id);
    // The key may be any order but the stored one, which would give the answer away.
    return arrangementOtherThan(stored, stored).map((order) => ({
      type: ordering.type,
      payload: { items: entries.map((entry) => ({ id: entry.id, content: text(entry.shown) })) },
      key: { order },
    }));
  }),
  correctResponse: (question: Drawn) => ({ order: ordering.keySchema.parse(question.key).order }),
  wrongResponse: (question: Drawn) => {
    const { order } = ordering.keySchema.parse(question.key);
    return arrangementOtherThan(order, order).map((other) => ({ order: other }));
  },
};

/**
 * A word of a typed answer: letters with and without accents, in both cases, and digits. It has
 * no "a", "t" or "q", so no entry built from these words begins with an English article, and a
 * run of "q" shares no character with any of them.
 */
export const answerWord = fc.string({
  unit: fc.constantFrom(...Array.from('bcdeghilmnoprsuvzBDEGLMNOPRSéöüñçł0123456789')),
  minLength: 1,
  maxLength: 8,
});

const answerEntry = fc
  .tuple(
    fc.array(answerWord, { minLength: 1, maxLength: 3 }),
    fc.constantFrom(' ', '-', ', '),
    fc.constantFrom('', '.', '!'),
  )
  .map(([words, joint, ending]) => `${words.join(joint)}${ending}`);

/** What the question schema compares to tell accepted from rejected: close enough for these words. */
const compared = (entry: string): string =>
  entry
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const textAnswerQuestion = fc
  .record({
    accepted: fc.uniqueArray(answerEntry, { minLength: 1, maxLength: 3, selector: compared }),
    rejected: fc.option(fc.array(answerEntry, { maxLength: 2 }), { nil: undefined }),
    maxTypos: fc.option(fc.integer({ min: 0, max: 2 }), { nil: undefined }),
  })
  .map(({ accepted, rejected, maxTypos }) => {
    const taken = accepted.map(compared);
    const key = {
      accepted,
      ...(rejected === undefined
        ? {}
        : { rejected: rejected.filter((entry) => !taken.includes(compared(entry))) }),
      ...(maxTypos === undefined ? {} : { maxTypos }),
    };
    return { type: typeAnswer.type, payload: { format: 'text' }, key };
  });

const numberAnswerQuestion = fc
  .record({
    // Thousandths, so the answer always prints without an exponent.
    value: fc
      .integer({ min: -999_999_999, max: 999_999_999 })
      .map((thousandths) => thousandths / 1000),
    tolerance: fc.constantFrom(0, 0.001, 0.5, 1, 10),
    units: fc.constantFrom(undefined, ['%', 'percent'], ['km', 'kilometres']),
  })
  .map(({ value, tolerance, units }) => ({
    type: typeAnswer.type,
    payload: { format: 'number' },
    key: {
      accepted: [String(value)],
      numeric: { value, tolerance, ...(units === undefined ? {} : { units }) },
    },
  }));

const typeAnswerKit: TypeKit = {
  type: typeAnswer.type,
  question: fc.oneof(textAnswerQuestion, numberAnswerQuestion),
  // The first accepted entry is the answer shown on reveal.
  correctResponse: (question: Drawn) => ({
    text: typeAnswer.keySchema.parse(question.key).accepted[0],
  }),
  wrongResponse: (question: Drawn) => {
    const { numeric } = typeAnswer.keySchema.parse(question.key);
    // Three or more of a letter no answer contains: further from every entry than any typo.
    const unrelated = fc
      .tuple(
        fc.integer({ min: 3, max: 12 }),
        fc.constantFrom('q', 'Q'),
        fc.constantFrom('', ' ', '?'),
      )
      .map(([length, letter, ending]) => ({ text: `${letter.repeat(length)}${ending}` }));
    if (numeric === undefined) return unrelated;

    // A whole number well outside the tolerance, with no separator to read two ways.
    const far = fc
      .integer({ min: 1, max: 9 })
      .map((steps) => Math.trunc(numeric.value) + Math.ceil(numeric.tolerance) + 10 * steps)
      .map((value) => ({ text: String(value) }));
    return fc.oneof(unrelated, far);
  },
};

export const mvpKits: TypeKit[] = [
  singleChoiceKit,
  trueFalseKit,
  imageChoiceKit,
  typeAnswerKit,
  orderingKit,
];
