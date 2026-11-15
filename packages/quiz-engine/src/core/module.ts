import * as z from 'zod';

// The contract between one question type and the engine (spec QT-01). A type is a module: three
// schemas, an optional rule across fields, and a pure grader. The rest of src/core works from
// this shape alone and never names a type, so a new type is a new module and nothing else.

// Grades

export type GradeStatus = 'correct' | 'incorrect' | 'unanswered' | 'invalid';

const invalidReasons = ['unknown_type', 'type_mismatch', 'malformed'] as const;

/**
 * Why an answer couldn't be graded: the engine doesn't hold the question's type, the answer is
 * tagged with another type, or it isn't an answer of that type at all.
 */
export type InvalidReason = (typeof invalidReasons)[number];

/** What grading one answer yields. Scoring reads this and never the question's type. */
export interface Grade {
  readonly status: GradeStatus;
  /** correct: 1 · incorrect: 0 ≤ credit < 1 · unanswered, invalid: 0 */
  readonly credit: number;
  /** Present only when status is 'invalid'. */
  readonly reason?: InvalidReason;
}

export function correct(): Grade {
  return { status: 'correct', credit: 1 };
}

/** `credit` is for types whose points scale with closeness; it defaults to none. */
export function incorrect(credit = 0): Grade {
  // Written so that NaN fails too.
  if (!(credit >= 0 && credit < 1)) {
    throw new RangeError(
      `An incorrect answer's credit is at least 0 and below 1; received ${String(credit)}.`,
    );
  }
  return { status: 'incorrect', credit };
}

/** No answer was given: the question timed out. */
export function unanswered(): Grade {
  return { status: 'unanswered', credit: 0 };
}

export function invalid(reason: InvalidReason): Grade {
  return { status: 'invalid', credit: 0, reason };
}

/** Strict, and holds the credit rules, so a grade that crossed the network can be trusted. */
export const gradeSchema: z.ZodType<Grade> = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('correct'), credit: z.literal(1) }),
  z.strictObject({ status: z.literal('incorrect'), credit: z.number().min(0).lt(1) }),
  z.strictObject({ status: z.literal('unanswered'), credit: z.literal(0) }),
  z.strictObject({
    status: z.literal('invalid'),
    credit: z.literal(0),
    reason: z.enum(invalidReasons),
  }),
]);

// Question types

/** Which Standard time limit a type gets (spec §10.3): picking an answer, or constructing one. */
export type TimeClass = 'choice' | 'constructed';

/** A problem a module's `check` found in a question. */
export interface QuestionIssue {
  /** Relative to the question, for example ['key', 'correctOptionId']. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface QuestionTypeModule<
  TType extends string,
  TPayload,
  TKey,
  TResponse,
  TTunables = undefined,
> {
  readonly type: TType;
  readonly timeClass: TimeClass;
  /** What a player is shown. Safe to send before they answer. */
  readonly payloadSchema: z.ZodType<TPayload>;
  /** The answer. In a Tier A session it stays on the server until the player has answered (§10.1). */
  readonly keySchema: z.ZodType<TKey>;
  /** What a player submits. */
  readonly responseSchema: z.ZodType<TResponse>;
  /** Declares that the type has tunables. Without it, `TTunables` stays `undefined`. */
  readonly tunablesSchema?: z.ZodType<TTunables>;
  /** Rules across fields that a per-field schema can't state. Empty when the question is sound. */
  readonly check?: (question: {
    readonly payload: TPayload;
    readonly key: TKey;
  }) => readonly QuestionIssue[];
  /** Pure. Total over every question the registry's schema accepts and every parsed response. */
  readonly grade: (
    question: { readonly payload: TPayload; readonly key: TKey },
    response: TResponse,
    context: { readonly locale: string; readonly tunables: TTunables },
  ) => Grade;
}

/** Returns the module as given. It exists so the five type parameters are inferred, not written. */
export function defineQuestionType<
  TType extends string,
  TPayload,
  TKey,
  TResponse,
  TTunables = undefined,
>(
  module: QuestionTypeModule<TType, TPayload, TKey, TResponse, TTunables>,
): QuestionTypeModule<TType, TPayload, TKey, TResponse, TTunables> {
  return module;
}
