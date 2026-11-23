// The public API of @repo/quiz-engine: question-type schemas, graders, answer normalization and
// scoring, the same code on the device and on the server. Re-exports only, each by name; what a
// file exports beyond these names is internal. A new question type adds nothing here: it is one
// more entry in `mvpQuestionTypes`. The shared fixtures are a second entry point,
// `@repo/quiz-engine/fixtures`.

export {
  correct,
  defineQuestionType,
  gradeSchema,
  incorrect,
  invalid,
  unanswered,
} from './core/module.ts';
export type {
  Grade,
  GradeStatus,
  InvalidReason,
  QuestionIssue,
  QuestionTypeModule,
  TimeClass,
} from './core/module.ts';

export { createRegistry } from './core/registry.ts';
export type {
  AnswerOf,
  AnyQuestionTypeModule,
  PlayerQuestionOf,
  QuestionOf,
  Registry,
  TunablesOf,
} from './core/registry.ts';

export { gradeAnswer, toPlayerQuestion } from './core/grading.ts';
export type { GradeContext } from './core/grading.ts';

export {
  difficultyMultiplier,
  scoreAnswer,
  scoreInputSchema,
  scoreSession,
  scoringConfigSchema,
  specScoringConfig,
} from './core/scoring.ts';
export type {
  AnswerScore,
  ScoreInput,
  ScoreTiming,
  ScoringConfig,
  SessionScore,
} from './core/scoring.ts';

export { specTimingConfig, standardLimitMs, timingConfigSchema } from './core/timing.ts';
export type { TimingConfig } from './core/timing.ts';

export { evaluateSession } from './core/session.ts';
export type { SessionEvaluation, SessionItem } from './core/session.ts';

export { runGradingFixtures, runScoringFixtures } from './core/conformance.ts';
export type { FixtureReport, GradingFixture, ScoringFixture } from './core/conformance.ts';

export { normalizeAnswerText } from './text/normalize.ts';
export type { ArticlesByLanguage } from './text/normalize.ts';

export {
  maxResponseLength,
  specTypeAnswerTunables,
  typeAnswerTunablesSchema,
} from './types/type-answer.ts';
export type { TypeAnswerTunables } from './types/type-answer.ts';

export { mvpQuestionTypes, mvpRegistry, specMvpTunables } from './types/index.ts';
export type { Answer, MvpTunables, PlayerQuestion, Question, QuestionType } from './types/index.ts';
