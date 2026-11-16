import * as z from 'zod';
import { defineQuestionType } from '../core/module.ts';
import { checkOptions, gradeChoice, optionIdSchema } from './choice.ts';
import { blocksSchema } from './content.ts';

// One right answer among two to four options (spec §7.4). The order of `payload.options` is the
// authored order; the app decides the order shown, and no order changes a grade.

const optionSchema = z.strictObject({ id: optionIdSchema, content: blocksSchema });

export const singleChoice = defineQuestionType({
  type: 'single_choice',
  timeClass: 'choice',
  payloadSchema: z.strictObject({ options: z.array(optionSchema).min(2).max(4) }),
  keySchema: z.strictObject({ correctOptionId: optionIdSchema }),
  responseSchema: z.strictObject({ optionId: optionIdSchema }),
  check: ({ payload, key }) => checkOptions(payload.options, key.correctOptionId, 'content'),
  grade: ({ payload, key }, response) =>
    gradeChoice(
      payload.options.map((option) => option.id),
      key.correctOptionId,
      response.optionId,
    ),
});
