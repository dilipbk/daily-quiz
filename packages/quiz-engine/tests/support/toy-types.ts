import fc from 'fast-check';
import * as z from 'zod';
import { correct, defineQuestionType, incorrect } from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';
import type { TypeKit } from './registry-properties.ts';

// Two question types that exist only in tests. The core is built and proven against them before
// any real type exists, which is what shows it depends on none of the real ones (QT-01).

/** A statement that is true or false: no tunables and no rule across fields. */
export const toyFlag = defineQuestionType({
  type: 'toy_flag',
  timeClass: 'choice',
  payloadSchema: z.strictObject({}),
  keySchema: z.strictObject({ value: z.boolean() }),
  responseSchema: z.strictObject({ value: z.boolean() }),
  grade: (question, response) => (response.value === question.key.value ? correct() : incorrect()),
});

/** A word to type from a hint: one tunable, and one rule that spans the payload and the key. */
export const toyWord = defineQuestionType({
  type: 'toy_word',
  timeClass: 'constructed',
  payloadSchema: z.strictObject({ hint: z.string() }),
  keySchema: z.strictObject({ word: z.string().min(1) }),
  responseSchema: z.strictObject({ word: z.string() }),
  tunablesSchema: z.strictObject({ ignoreCase: z.boolean() }),
  check: ({ payload, key }) =>
    key.word === payload.hint
      ? [{ path: ['key', 'word'], message: 'The hint gives the word away.' }]
      : [],
  grade: (question, response, { tunables }) => {
    const fold = (word: string): string => (tunables.ignoreCase ? word.toLowerCase() : word);
    return fold(response.word) === fold(question.key.word) ? correct() : incorrect();
  },
});

export const toyRegistry = createRegistry([toyFlag, toyWord]);

// The same fold the grader applies, so a response the kit calls wrong is wrong with either setting.
const sameWord = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** How to draw and answer each toy type, for the properties every registry must hold. */
export const toyKits: TypeKit[] = [
  {
    type: toyFlag.type,
    question: fc.boolean().map((value) => ({ type: toyFlag.type, payload: {}, key: { value } })),
    correctResponse: (question) => ({ value: toyFlag.keySchema.parse(question.key).value }),
    wrongResponse: (question) =>
      fc.constant({ value: !toyFlag.keySchema.parse(question.key).value }),
  },
  {
    type: toyWord.type,
    question: fc
      .tuple(fc.string({ unit: 'grapheme' }), fc.string({ unit: 'grapheme', minLength: 1 }))
      .filter(([hint, word]) => hint !== word)
      .map(([hint, word]) => ({ type: toyWord.type, payload: { hint }, key: { word } })),
    correctResponse: (question) => ({ word: toyWord.keySchema.parse(question.key).word }),
    wrongResponse: (question) =>
      fc
        .string({ unit: 'grapheme' })
        .filter((word) => !sameWord(word, toyWord.keySchema.parse(question.key).word))
        .map((word) => ({ word })),
  },
];
