import * as z from 'zod';
import { correct, defineQuestionType, incorrect } from '../core/module.ts';

// A statement that is true or false (spec §7.4). The statement is the question's prompt and the
// two labels are app strings, so the payload is empty. A question that needs other labels
// ("Fact" and "Myth") is a two-option single_choice.

export const trueFalse = defineQuestionType({
  type: 'true_false',
  timeClass: 'choice',
  payloadSchema: z.strictObject({}),
  keySchema: z.strictObject({ value: z.boolean() }),
  responseSchema: z.strictObject({ value: z.boolean() }),
  grade: ({ key }, response) => (response.value === key.value ? correct() : incorrect()),
});
