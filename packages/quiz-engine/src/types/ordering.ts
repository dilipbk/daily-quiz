import * as z from 'zod';
import { correct, defineQuestionType, incorrect, invalid } from '../core/module.ts';
import type { QuestionIssue } from '../core/module.ts';
import { checkDistinct, optionIdSchema } from './choice.ts';
import { blocksSchema } from './content.ts';

// Put three to six items in order (spec §7.4). All or nothing: any order but the key's is
// incorrect with no credit, because the spec scales points only for slider and map types.
// `payload.items` is the authored order. It reaches the player before they answer, so it must
// not be the key's order.

const itemSchema = z.strictObject({ id: optionIdSchema, content: blocksSchema });

/** The same bounds as the items, so an order that could fit no question is refused unread. */
const orderSchema = z.array(optionIdSchema).min(3).max(6);

const sameOrder = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/** Whether `order` holds exactly the ids of `ids`, each as often, in any order. */
const isArrangementOf = (order: readonly string[], ids: readonly string[]): boolean =>
  // The default sort compares UTF-16 code units: no locale is read.
  sameOrder([...order].sort(), [...ids].sort());

function checkOrdering(question: {
  readonly payload: {
    readonly items: readonly { readonly id: string; readonly content: unknown }[];
  };
  readonly key: { readonly order: readonly string[] };
}): QuestionIssue[] {
  const { items } = question.payload;
  const { order } = question.key;
  const ids = items.map((item) => item.id);
  const issues = checkDistinct(items, ['payload', 'items'], 'content');

  if (!isArrangementOf(order, ids)) {
    issues.push({
      path: ['key', 'order'],
      message: "List every item's id exactly once, in the right order.",
    });
  } else if (sameOrder(ids, order)) {
    issues.push({
      path: ['payload', 'items'],
      message:
        'The items are stored in the order of the answer, which gives it away. Store them in another order.',
    });
  }
  return issues;
}

export const ordering = defineQuestionType({
  type: 'ordering',
  timeClass: 'constructed',
  payloadSchema: z.strictObject({ items: z.array(itemSchema).min(3).max(6) }),
  keySchema: z.strictObject({ order: orderSchema }),
  responseSchema: z.strictObject({ order: orderSchema }),
  check: checkOrdering,
  grade: ({ payload, key }, response) => {
    const ids = payload.items.map((item) => item.id);
    // A missing, extra, repeated or unknown id: not an arrangement the device could have built.
    if (!isArrangementOf(response.order, ids)) return invalid('malformed');

    return sameOrder(response.order, key.order) ? correct() : incorrect();
  },
});
