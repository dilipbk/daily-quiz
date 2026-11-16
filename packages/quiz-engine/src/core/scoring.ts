import * as z from 'zod';
import { gradeSchema } from './module.ts';
import type { Grade } from './module.ts';

// Points for answers and sessions (spec §10.5, D13). Scoring reads a grade, never a question's
// type, and every value it uses is passed in: the spec's numbers exist once, as
// `specScoringConfig`, and nothing here falls back to them.

export interface ScoringConfig {
  /** Points for a correct answer before the difficulty multiplier. */
  readonly basePoints: number;
  /** The line that turns a question's rating into its multiplier, between two anchors. */
  readonly difficulty: {
    readonly minRating: number;
    readonly maxRating: number;
    readonly minMultiplier: number;
    readonly maxMultiplier: number;
  };
  /** The speed bonus for an instant answer, as a share of base points. */
  readonly speedBonusMaxRatio: number;
  /** Points added per consecutive correct answer after the first. */
  readonly comboStep: number;
  readonly comboCap: number;
}

/**
 * The largest difficulty multiplier a config or an answer may carry. A hard cap and not a
 * tunable: it bounds what one answer can score when the number comes from outside.
 */
const maxDifficultyMultiplier = 10;

const multiplierSchema = z.number().positive().max(maxDifficultyMultiplier);

export const scoringConfigSchema: z.ZodType<ScoringConfig> = z.strictObject({
  basePoints: z.int().positive(),
  difficulty: z
    .strictObject({
      minRating: z.number(),
      maxRating: z.number(),
      minMultiplier: multiplierSchema,
      maxMultiplier: multiplierSchema,
    })
    .refine(({ minRating, maxRating }) => minRating < maxRating, {
      error: 'minRating must be below maxRating: the multiplier is a line between the two.',
      path: ['maxRating'],
    })
    .refine(({ minMultiplier, maxMultiplier }) => minMultiplier <= maxMultiplier, {
      error: 'minMultiplier must not be above maxMultiplier.',
      path: ['maxMultiplier'],
    }),
  speedBonusMaxRatio: z.number().nonnegative(),
  comboStep: z.int().nonnegative(),
  comboCap: z.int().nonnegative(),
});

/** The §10.5 values. Rating anchors are the seeds of §11.5: easy 1200, hard 1800. */
export const specScoringConfig: ScoringConfig = Object.freeze({
  basePoints: 100,
  difficulty: Object.freeze({
    minRating: 1200,
    maxRating: 1800,
    minMultiplier: 0.8,
    maxMultiplier: 1.5,
  }),
  speedBonusMaxRatio: 0.5,
  comboStep: 10,
  comboCap: 50,
});

// The guards below are why scoring can't return NaN, a fraction, a negative number or more than
// the config allows, whatever it is handed. The schemas refuse impossible values; these hold for
// a caller that skipped them, and garbage then earns nothing rather than something.

/** A share from 0 to 1. NaN, which no comparison accepts, is 0. */
const clamp01 = (value: number): number => (value > 0 ? Math.min(value, 1) : 0);

/** A count of points or of answers: a whole number, never negative, NaN or infinite. */
const whole = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

/**
 * A multiplier as scoring uses it: held between the config's two anchors, which is where
 * `difficultyMultiplier` puts every rating. One that is no positive, finite number is 0.
 */
const withinAnchors = (multiplier: number, config: ScoringConfig['difficulty']): number =>
  Number.isFinite(multiplier) && multiplier > 0
    ? Math.min(config.maxMultiplier, Math.max(config.minMultiplier, multiplier))
    : 0;

/**
 * A question's multiplier from its rating: a line between the two anchors, flat beyond them. The
 * server calls this once when it builds a session and stores the result, because ratings drift
 * and two players of one challenge must be scored on one value.
 */
export function difficultyMultiplier(rating: number, config: ScoringConfig['difficulty']): number {
  const { minRating, maxRating, minMultiplier, maxMultiplier } = config;
  const position = clamp01((rating - minRating) / (maxRating - minRating));
  const onTheLine = minMultiplier + (maxMultiplier - minMultiplier) * position;
  // The addition can pass an anchor by one bit (0.3 + 0.6 is 0.9000000000000001), so hold the ends.
  return Math.min(maxMultiplier, Math.max(minMultiplier, onTheLine));
}

/**
 * When an answer came, against the question's Standard limit. There is deliberately no field for
 * the player's time setting (A11Y-08): extra time never earns extra points (D13).
 */
export type ScoreTiming =
  | { readonly timed: false }
  | { readonly timed: true; readonly elapsedMs: number; readonly standardLimitMs: number };

export interface ScoreInput {
  readonly grade: Grade;
  /**
   * Frozen into the session when it was built; see `difficultyMultiplier`. Scoring holds it to
   * the config's anchors, so a value from outside can't earn more than the hardest question.
   */
  readonly difficultyMultiplier: number;
  readonly timing: ScoreTiming;
}

export const scoreInputSchema: z.ZodType<ScoreInput> = z.strictObject({
  grade: gradeSchema,
  difficultyMultiplier: multiplierSchema,
  timing: z.discriminatedUnion('timed', [
    z.strictObject({ timed: z.literal(false) }),
    z.strictObject({
      timed: z.literal(true),
      elapsedMs: z.int().nonnegative(),
      standardLimitMs: z.int().positive(),
    }),
  ]),
});

export interface AnswerScore {
  readonly base: number;
  readonly speedBonus: number;
  readonly combo: number;
  readonly total: number;
  /** Consecutive correct answers, including this one. */
  readonly streak: number;
}

/** The share of the Standard limit that was left when the answer came, from 0 to 1. */
const shareOfLimitLeft = (timing: ScoreTiming): number =>
  timing.timed && timing.standardLimitMs > 0
    ? clamp01((timing.standardLimitMs - timing.elapsedMs) / timing.standardLimitMs)
    : 0;

/**
 * Points are integers. Base and speed bonus are each rounded half up, the speed bonus is a share
 * of the rounded base, and the combo is flat: neither difficulty nor speed multiplies it. The
 * first correct answer of a run earns no combo.
 */
export function scoreAnswer(
  input: ScoreInput,
  streakBefore: number,
  config: ScoringConfig,
): AnswerScore {
  const isCorrect = input.grade.status === 'correct';

  const credit = clamp01(input.grade.credit);
  const multiplier = withinAnchors(input.difficultyMultiplier, config.difficulty);
  const base = whole(config.basePoints * multiplier * credit);
  const speedBonus = whole(base * config.speedBonusMaxRatio * shareOfLimitLeft(input.timing));
  const streak = isCorrect ? whole(streakBefore) + 1 : 0;
  const combo = isCorrect ? whole(Math.min(config.comboStep * (streak - 1), config.comboCap)) : 0;

  return { base, speedBonus, combo, total: base + speedBonus + combo, streak };
}

export interface SessionScore {
  readonly answers: readonly AnswerScore[];
  readonly totalPoints: number;
  readonly correctCount: number;
  readonly questionCount: number;
}

/** Scores answers in the order they were given; the order is what a combo is made of. */
export function scoreSession(inputs: readonly ScoreInput[], config: ScoringConfig): SessionScore {
  const answers: AnswerScore[] = [];
  let streak = 0;
  for (const input of inputs) {
    const score = scoreAnswer(input, streak, config);
    answers.push(score);
    streak = score.streak;
  }

  return {
    answers,
    totalPoints: answers.reduce((sum, answer) => sum + answer.total, 0),
    correctCount: inputs.filter((input) => input.grade.status === 'correct').length,
    questionCount: inputs.length,
  };
}
