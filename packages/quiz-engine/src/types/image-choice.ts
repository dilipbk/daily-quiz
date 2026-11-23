import * as z from 'zod';
import { defineQuestionType } from '../core/module.ts';
import { checkOptions, gradeChoice, optionIdSchema } from './choice.ts';
import { imageBlockSchema } from './content.ts';

// One right answer among two to four pictures (spec §7.4). An option is exactly one image, and
// the image carries its alt text, so the question can be answered without seeing it (A11Y-10).

const optionSchema = z.strictObject({ id: optionIdSchema, image: imageBlockSchema });

export const imageChoice = defineQuestionType({
  type: 'image_choice',
  timeClass: 'choice',
  payloadSchema: z.strictObject({ options: z.array(optionSchema).min(2).max(4) }),
  keySchema: z.strictObject({ correctOptionId: optionIdSchema }),
  responseSchema: z.strictObject({ optionId: optionIdSchema }),
  check: ({ payload, key }) =>
    checkOptions(
      payload.options.map((option) => ({ id: option.id, content: option.image })),
      key.correctOptionId,
      'image',
    ),
  grade: ({ payload, key }, response) =>
    gradeChoice(
      payload.options.map((option) => option.id),
      key.correctOptionId,
      response.optionId,
    ),
});
