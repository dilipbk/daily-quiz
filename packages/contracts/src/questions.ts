import { blocksSchema } from '@repo/content-blocks';
import { mvpRegistry, scoringConfigSchema, toPlayerQuestion } from '@repo/quiz-engine';
import * as z from 'zod';
import { httpsUrlSchema, idSchema, localeSchema, slugSchema } from './primitives.ts';
import { renderingsSchema } from './published.ts';

// A question on the wire. The engine owns the triple `{ type, payload, key }` and its schemas
// (ADR 0020); this file adds the rest of what a session needs: the prompt, the explanation, and
// the three values the engine is handed as arguments. Those three are frozen when a session's
// snapshot is built, so the device and the server score with the same numbers (ADR 0021).

const sourceLinkSchema = z.object({
  title: z.string().min(1).max(200),
  url: httpsUrlSchema,
});

/** What a question carries whether or not its key travels with it. */
const itemShape = {
  id: idSchema,
  /** The version that was played. Editing a published question makes a new one (spec §11.2). */
  version: z.int().min(1).max(1_000_000),
  /** The launch domain the question belongs to: what tints the screen and the result grid. */
  domain: slugSchema,
  /** The question's content language, which grading reads. Never the device's. */
  locale: localeSchema,
  /**
   * From the question's rating when the snapshot was built. The bounds are the engine's: its
   * score input refuses a multiplier that isn't above 0 and at most 10.
   */
  difficultyMultiplier: z.number().positive().max(10),
  /** The Standard limit the speed bonus is measured against, whatever the player's setting (D13). */
  standardLimitMs: z.int().min(1).max(600_000),
  prompt: blocksSchema,
  /** The renderings of the prompt and of the payload: everything shown before an answer. */
  renderings: renderingsSchema,
};

/**
 * A question in a Tier B session's snapshot: the key travels with it and the device grades
 * (spec §10.1). The explanation keeps its own renderings, so that a view without the key can
 * leave behind everything that is shown only after an answer.
 */
export const sessionQuestionSchema = z.object({
  ...itemShape,
  question: mvpRegistry.questionSchema,
  explanation: z.object({
    blocks: blocksSchema,
    /** PLAY-06: every question cites what it rests on. */
    sources: z.array(sourceLinkSchema).min(1).max(10),
    renderings: renderingsSchema,
  }),
});

/**
 * A question as a player may see it before answering, wherever the key must stay behind: a
 * preview, a shared page, a Tier A session. Strict, so a key, an explanation or its sources
 * can't ride along, here or inside `question`.
 */
export const playerQuestionItemSchema = z.strictObject({
  ...itemShape,
  question: mvpRegistry.playerQuestionSchema,
});

export type SessionQuestion = z.infer<typeof sessionQuestionSchema>;
export type PlayerQuestionItem = z.infer<typeof playerQuestionItemSchema>;

/**
 * The keyless view of a session question. It is built from the fields named here and not by
 * removing the key, so whatever else a stored question gains stays behind by default.
 */
export function toPlayerQuestionItem(item: SessionQuestion): PlayerQuestionItem {
  return {
    id: item.id,
    version: item.version,
    domain: item.domain,
    locale: item.locale,
    difficultyMultiplier: item.difficultyMultiplier,
    standardLimitMs: item.standardLimitMs,
    prompt: item.prompt,
    renderings: item.renderings,
    question: toPlayerQuestion(item.question),
  };
}

/** The most questions one session holds. A hard cap: it bounds a snapshot and a completion. */
export const maxSessionQuestions = 50;

/**
 * What a session is scored with, as the values themselves: the scoring config and the type
 * tunables in force when its snapshot was built. A session keeps them however remote config
 * changes afterwards (roadmap §7), and the server re-grades from the snapshot alone.
 */
export const sessionRulesSchema = z.object({
  scoring: scoringConfigSchema,
  tunables: mvpRegistry.tunablesSchema,
});

/** An immutable snapshot: everything grading and scoring read, and nothing that changes. */
export const questionSetSchema = z.object({
  rules: sessionRulesSchema,
  questions: z
    .array(sessionQuestionSchema)
    .min(1)
    .max(maxSessionQuestions)
    .refine((questions) => new Set(questions.map(({ id }) => id)).size === questions.length, {
      error: 'A question appears once in a set.',
    }),
});

export type SessionRules = z.infer<typeof sessionRulesSchema>;
export type QuestionSet = z.infer<typeof questionSetSchema>;
