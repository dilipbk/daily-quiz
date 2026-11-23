import { gradeAnswer } from './grading.ts';
import type { Grade } from './module.ts';
import type { AnyQuestionTypeModule, Registry, TunablesOf } from './registry.ts';
import { scoreSession } from './scoring.ts';
import type { ScoreTiming, ScoringConfig, SessionScore } from './scoring.ts';

// A whole session, graded and scored in one call: what the app runs at `finishing` (spec §10.2)
// and what the server runs to re-grade a completion against the session's snapshot (roadmap §4.3).
// Both must be handed the values the session started with, or the two results can differ.

export interface SessionItem {
  readonly question: { readonly type: string; readonly payload: unknown; readonly key: unknown };
  /** As the device sent it: untrusted, and `null` when the question timed out. */
  readonly answer: unknown;
  /** The question's content language. */
  readonly locale: string;
  readonly difficultyMultiplier: number;
  readonly timing: ScoreTiming;
}

export interface SessionEvaluation {
  /** One grade per item, in order. */
  readonly grades: readonly Grade[];
  readonly score: SessionScore;
}

export function evaluateSession<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  items: readonly SessionItem[],
  tunables: TunablesOf<M>,
  scoring: ScoringConfig,
): SessionEvaluation {
  const graded = items.map((item) => ({
    grade: gradeAnswer(registry, item.question, item.answer, { locale: item.locale, tunables }),
    difficultyMultiplier: item.difficultyMultiplier,
    timing: item.timing,
  }));

  return { grades: graded.map((input) => input.grade), score: scoreSession(graded, scoring) };
}
