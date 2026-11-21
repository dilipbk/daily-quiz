import { gradeSchema, mvpRegistry } from '@repo/quiz-engine';
import type { AnswerScore, SessionEvaluation, SessionItem } from '@repo/quiz-engine';
import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import {
  countSchema,
  idSchema,
  isoTimestampSchema,
  localDateSchema,
  timeZoneSchema,
  utcOffsetMinutesSchema,
} from '../primitives.ts';
import { maxSessionQuestions, questionSetSchema } from '../questions.ts';
import type { QuestionSet } from '../questions.ts';
import { playModeSchema } from '../rules.ts';
import { progressSchema } from './progress.ts';

// Sessions and their completion (spec §19.3, §10, roadmap §4.3). A session is a player's attempt
// at a set of questions. Its snapshot never changes, the device grades against it as the player
// goes, and one request at the end carries every answer. The server grades the same answers
// against the same snapshot with the same engine, and its result is the authority.

// Starting a session

/**
 * What to play. For a daily this is get-or-create, unique on player, date and source, so two
 * devices get one session; it accepts tomorrow's date, which is how a daily is prefetched
 * (DLY-07). A challenge's session comes from accepting the challenge (BE-15).
 */
export const createSessionSchema = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('global_daily'), date: localDateSchema }),
  z.strictObject({ source: z.literal('daily_5'), date: localDateSchema }),
  z.strictObject({ source: z.literal('quiz'), quizId: idSchema, mode: playModeSchema }),
]);

// The server's result

const answerScoreSchema: z.ZodType<AnswerScore> = z.object({
  base: countSchema,
  speedBonus: countSchema,
  combo: countSchema,
  total: countSchema,
  streak: countSchema,
});

/**
 * The engine's `SessionEvaluation`, as `evaluateSession` returns it: a grade and a score for each
 * answer, in the order the answers were given. The app can compare it with its own, field by field.
 */
export const sessionEvaluationSchema: z.ZodType<SessionEvaluation> = z.object({
  grades: z.array(gradeSchema).max(maxSessionQuestions),
  score: z.object({
    answers: z.array(answerScoreSchema).max(maxSessionQuestions),
    totalPoints: countSchema,
    correctCount: countSchema,
    questionCount: countSchema,
  }),
});

export const completionResultSchema = z.object({
  sessionId: idSchema,
  serverTime: isoTimestampSchema,
  /** The calendar date the completion was credited to: the player's local date when it ended. */
  creditedDate: localDateSchema,
  evaluation: sessionEvaluationSchema,
  xpEarned: countSchema,
  /** DLY-06: the share of players this score beats or equals, or `null` where none is shown. */
  percentile: z.int().min(0).max(100).nullable(),
  /** The player's progress with this completion counted, so the app needs no second request. */
  progress: progressSchema,
});

// A session

const sessionShape = {
  id: idSchema,
  mode: playModeSchema,
  status: z.enum(['open', 'completed']),
  createdAt: isoTimestampSchema,
  /**
   * After this the session can no longer be started or resumed. For a daily it is the moment its
   * date has ended everywhere; the app also stops at the end of the date where the player is.
   */
  expiresAt: isoTimestampSchema,
  serverTime: isoTimestampSchema,
  /** The stored result once the session is completed, so a second device shows the same one. */
  result: completionResultSchema.nullable(),
};

/**
 * A player's session. A Global Daily names the content version of its body, which the app
 * fetches from `GET /daily/global/:date/:contentVersion`; every other source carries its set.
 */
export const sessionSchema = z
  .discriminatedUnion('source', [
    z.object({
      ...sessionShape,
      source: z.literal('global_daily'),
      date: localDateSchema,
      contentVersion: idSchema,
    }),
    z.object({
      ...sessionShape,
      source: z.literal('daily_5'),
      date: localDateSchema,
      set: questionSetSchema,
    }),
    z.object({
      ...sessionShape,
      source: z.literal('quiz'),
      quizId: idSchema,
      quizVersion: z.int().min(1).max(1_000_000),
      set: questionSetSchema,
    }),
  ])
  .refine((session) => (session.status === 'completed') === (session.result !== null), {
    error: 'A completed session has its result, and an open one has none.',
    path: ['result'],
  });

// Completing a session

/** The longest one question can be open, in milliseconds: a day. */
const maxElapsedMs = 86_400_000;

const answerEntrySchema = z.strictObject({
  questionId: idSchema,
  /** What the player submitted, tagged with its type, or `null` when the question timed out. */
  answer: mvpRegistry.answerSchema.nullable(),
  /** Whole milliseconds the question was open, pauses left out: what the speed bonus is measured on. */
  elapsedMs: z.int().min(0).max(maxElapsedMs),
  /** Whether a clock ran. Untimed (Relaxed mode, or the A11Y-08 setting) earns no speed bonus. */
  timed: z.boolean(),
  /** Whole milliseconds the question spent paused, for the plausibility check (spec §10.3). */
  pausedMs: z
    .int()
    .min(0)
    .max(7 * maxElapsedMs),
});

/**
 * Everything the server needs to grade a session again and credit it to a day. Strict, and sent
 * with an `Idempotency-Key`: the app writes it to its outbox before the first send and repeats
 * the same body under the same key until it is answered (OFF-03).
 */
export const completionSchema = z.strictObject({
  /** The version of the grading engine in the app that played. */
  engineVersion: z.int().min(1).max(1_000_000),
  /** By the device's clock. */
  startedAt: isoTimestampSchema,
  /** By the device's clock: the instant the streak day is credited from (OFF-04). */
  completedAt: isoTimestampSchema,
  /**
   * The server's clock minus the device's, in milliseconds, as the app last measured it from a
   * `serverTime`; `null` if it never has. The server adds it to the two times above.
   */
  serverOffsetMs: z.int().nullable(),
  /** The device's zone when the session ended. It decides the calendar date that is credited. */
  timeZone: timeZoneSchema,
  /** The zone's offset at that instant: the server's fallback for a zone it doesn't know (ADR 0005). */
  utcOffsetMinutes: utcOffsetMinutesSchema,
  /** One entry for each question of the session, in the order they were answered. */
  answers: z
    .array(answerEntrySchema)
    .min(1)
    .max(maxSessionQuestions)
    .refine(
      (answers) => new Set(answers.map((entry) => entry.questionId)).size === answers.length,
      { error: 'A question is answered once.' },
    ),
});

export const sessionParamsSchema = z.strictObject({ sessionId: idSchema });

export type CreateSession = z.infer<typeof createSessionSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type CompletionResult = z.infer<typeof completionResultSchema>;

export type SessionItemsResult =
  | { readonly ok: true; readonly items: SessionItem[] }
  | {
      readonly ok: false;
      /** The completion answers a question the set doesn't hold, leaves one out, or repeats one. */
      readonly reason: 'unknown_question' | 'missing_question' | 'repeated_question';
      readonly questionId: string;
    };

/**
 * A snapshot and a completion as the engine's input: what the app passes to `evaluateSession`
 * when a session finishes and what the server passes when it grades it again. It lives here so
 * there is one way to build it: items in the order answered, each with the snapshot's question,
 * locale and multiplier, and the snapshot's Standard limit when the answer was timed.
 */
export function sessionItemsOf(
  set: Pick<QuestionSet, 'questions'>,
  completion: Pick<Completion, 'answers'>,
): SessionItemsResult {
  const questions = new Map(set.questions.map((question) => [question.id, question]));
  const answered = new Set<string>();
  const items: SessionItem[] = [];

  for (const entry of completion.answers) {
    const question = questions.get(entry.questionId);
    if (question === undefined) {
      return { ok: false, reason: 'unknown_question', questionId: entry.questionId };
    }
    if (answered.has(entry.questionId)) {
      return { ok: false, reason: 'repeated_question', questionId: entry.questionId };
    }
    answered.add(entry.questionId);

    items.push({
      question: question.question,
      answer: entry.answer,
      locale: question.locale,
      difficultyMultiplier: question.difficultyMultiplier,
      timing: entry.timed
        ? { timed: true, elapsedMs: entry.elapsedMs, standardLimitMs: question.standardLimitMs }
        : { timed: false },
    });
  }

  const missing = set.questions.find((question) => !answered.has(question.id));
  if (missing !== undefined)
    return { ok: false, reason: 'missing_question', questionId: missing.id };

  return { ok: true, items };
}

export const createSession = defineEndpoint({
  id: 'sessions.create',
  area: 'sessions',
  method: 'POST',
  path: '/sessions',
  access: 'player',
  summary: "Start a session, or get the player's existing session for a daily.",
  params: null,
  query: null,
  body: createSessionSchema,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: sessionSchema },
  errors: ['daily_not_available', 'not_found'],
});

export const completeSession = defineEndpoint({
  id: 'sessions.complete',
  area: 'sessions',
  method: 'POST',
  path: '/sessions/:sessionId/complete',
  access: 'player',
  summary: 'Complete a session: grade it, credit its XP and streak day, and return the result.',
  params: sessionParamsSchema,
  query: null,
  body: completionSchema,
  idempotencyKey: true,
  caching: 'none',
  success: { status: 200, body: completionResultSchema },
  errors: [
    'idempotency_key_required',
    'not_found',
    'request_in_progress',
    'session_expired',
    'payload_too_large',
    'idempotency_key_reused',
  ],
});
