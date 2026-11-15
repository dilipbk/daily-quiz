import fc from 'fast-check';
import { image, text } from '../../src/fixtures/content.ts';
import { imageChoice } from '../../src/types/image-choice.ts';
import { singleChoice } from '../../src/types/single-choice.ts';
import { trueFalse } from '../../src/types/true-false.ts';
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

export const mvpKits: TypeKit[] = [singleChoiceKit, trueFalseKit, imageChoiceKit];
