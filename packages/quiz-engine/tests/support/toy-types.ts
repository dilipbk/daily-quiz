import * as z from 'zod';
import { correct, defineQuestionType, incorrect } from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';

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
