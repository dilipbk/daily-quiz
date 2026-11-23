import { blocksSchema } from '@repo/content-blocks';
import type { Block } from '@repo/content-blocks';
import fc from 'fast-check';
import * as z from 'zod';
import { correct, defineQuestionType, incorrect, invalid } from '../../src/index.ts';
import type { QuestionIssue } from '../../src/index.ts';
import type { TypeKit } from './registry-properties.ts';

// A sixth question type that exists only in tests: `multi_select`, the first V1 type of spec §7.4.
// It is written as a new type would be, from the package's public API alone, to show that the
// engine takes one without a change to src/core (QT-01).

const idSchema = z.string().min(1).max(32);

const hasRepeats = (ids: readonly string[]): boolean => new Set(ids).size !== ids.length;

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

export const multiSelect = defineQuestionType({
  type: 'multi_select',
  timeClass: 'choice',
  payloadSchema: z.strictObject({
    options: z
      .array(z.strictObject({ id: idSchema, content: blocksSchema }))
      .min(2)
      .max(6),
  }),
  keySchema: z.strictObject({ correctOptionIds: z.array(idSchema).min(1).max(6) }),
  /** No option selected is an answer, and a wrong one: at least one option is always correct. */
  responseSchema: z.strictObject({ optionIds: z.array(idSchema).max(6) }),
  check: ({ payload, key }) => {
    const ids = payload.options.map((option) => option.id);
    const issues: QuestionIssue[] = [];

    if (hasRepeats(ids)) {
      issues.push({ path: ['payload', 'options'], message: 'Give each option its own id.' });
    }
    if (hasRepeats(key.correctOptionIds) || key.correctOptionIds.some((id) => !ids.includes(id))) {
      issues.push({
        path: ['key', 'correctOptionIds'],
        message: 'Name each correct option once, by the id of an option.',
      });
    }
    return issues;
  },
  grade: ({ payload, key }, response) => {
    const ids = payload.options.map((option) => option.id);
    const chosen = response.optionIds;
    // An unknown or repeated id was never a selection the device could have built.
    if (hasRepeats(chosen) || chosen.some((id) => !ids.includes(id))) return invalid('malformed');

    return sameSet(chosen, key.correctOptionIds) ? correct() : incorrect();
  },
});

/** One paragraph of plain text, as an author's tool would store it. */
export const text = (value: string): Block[] => [
  { type: 'paragraph', children: [{ type: 'text', text: value }] },
];

/** How to draw and answer a multi_select question, for the properties every registry must hold. */
export const multiSelectKit: TypeKit = {
  type: multiSelect.type,
  question: fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 32 }), { minLength: 2, maxLength: 6 })
    .chain((ids) =>
      fc.subarray(ids, { minLength: 1 }).map((correctOptionIds) => ({
        type: multiSelect.type,
        payload: {
          options: ids.map((id, index) => ({ id, content: text(`Option ${String(index + 1)}`) })),
        },
        key: { correctOptionIds },
      })),
    ),
  correctResponse: (question) => ({
    optionIds: multiSelect.keySchema.parse(question.key).correctOptionIds,
  }),
  wrongResponse: (question) => {
    const ids = multiSelect.payloadSchema
      .parse(question.payload)
      .options.map((option) => option.id);
    const { correctOptionIds } = multiSelect.keySchema.parse(question.key);

    // Any selection of the options but the right one. Selecting nothing is always among them.
    return fc
      .subarray(ids)
      .filter((chosen) => !sameSet(chosen, correctOptionIds))
      .map((optionIds) => ({ optionIds }));
  },
};
