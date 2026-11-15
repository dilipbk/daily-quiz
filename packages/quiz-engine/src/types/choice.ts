import * as z from 'zod';
import { deepEqual } from '../core/equal.ts';
import { correct, incorrect, invalid } from '../core/module.ts';
import type { Grade, QuestionIssue } from '../core/module.ts';

// What the types that offer a list to pick from, or to arrange, have in common: the ids of the
// entries, the rules a sound list keeps, and how a pick is graded.

/** The longest id, in characters. A hard cap, not a tunable: it bounds what a response carries. */
export const maxIdLength = 32;

/** The id of an option or an item, unique within its question. */
export const optionIdSchema = z.string().min(1).max(maxIdLength);

/** An option or an item as the checks see it: its id and whatever it shows. */
export interface Entry {
  readonly id: string;
  readonly content: unknown;
}

/**
 * Issues for a list in which an id or a content repeats, each at the later entry of the pair.
 * `listPath` is where the list sits in the question and `contentField` names what an entry shows.
 * Content is compared as parsed, structurally: "Mars" and "mars" are an editorial matter (CT-02).
 */
export function checkDistinct(
  entries: readonly Entry[],
  listPath: QuestionIssue['path'],
  contentField: string,
): QuestionIssue[] {
  return entries.flatMap((entry, index) => {
    const earlier = entries.slice(0, index);
    const issues: QuestionIssue[] = [];

    if (earlier.some((other) => other.id === entry.id)) {
      issues.push({
        path: [...listPath, index, 'id'],
        message: `The id "${entry.id}" is used twice. Give each entry its own id.`,
      });
    }
    if (earlier.some((other) => deepEqual(other.content, entry.content))) {
      issues.push({
        path: [...listPath, index, contentField],
        message: 'This shows the same thing as an earlier entry. Change one of them or remove it.',
      });
    }
    return issues;
  });
}

/** The rules of a list of options with one right answer, read from `payload.options`. */
export function checkOptions(
  options: readonly Entry[],
  correctOptionId: string,
  contentField: string,
): QuestionIssue[] {
  const issues = checkDistinct(options, ['payload', 'options'], contentField);

  if (!options.some((option) => option.id === correctOptionId)) {
    issues.push({
      path: ['key', 'correctOptionId'],
      message: `No option has the id "${correctOptionId}". Name one of the options as the answer.`,
    });
  }
  return issues;
}

export function gradeChoice(
  optionIds: readonly string[],
  correctOptionId: string,
  chosenOptionId: string,
): Grade {
  // An id the question doesn't offer was never a choice on the device.
  if (!optionIds.includes(chosenOptionId)) return invalid('malformed');

  return chosenOptionId === correctOptionId ? correct() : incorrect();
}
