import { blocksSchema } from '@repo/content-blocks';
import {
  gradeSchema,
  mvpRegistry,
  scoringConfigSchema,
  timingConfigSchema,
} from '@repo/quiz-engine';
import type * as z from 'zod';
import { configSchema, getConfig } from './areas/config.ts';
import { getDomains, getQuiz, listQuizzes, quizSchema } from './areas/content.ts';
import { getGlobalDailySet } from './areas/dailies.ts';
import { authGuest, getMe, playerSchema, putDevice, updateMe } from './areas/identity.ts';
import { getProgress, progressSchema } from './areas/progress.ts';
import {
  completeSession,
  createSession,
  sessionEvaluationSchema,
  sessionSchema,
} from './areas/sessions.ts';
import type { Endpoint } from './endpoint.ts';
import { problemSchema } from './errors.ts';
import { imageAssetSchema, renderingsSchema } from './published.ts';
import {
  playerQuestionItemSchema,
  questionSetSchema,
  sessionQuestionSchema,
  sessionRulesSchema,
} from './questions.ts';
import { gameRulesSchema } from './rules.ts';

// The endpoint registry (roadmap §3.1): every endpoint of the API, as data. The app's client
// calls through it, the API's router mounts from it, the fake server answers for it and the
// OpenAPI document is generated from it. An endpoint is added here before anyone implements it.

/** Each endpoint under its own name, so a caller keeps its request and response types. */
export const endpoints = {
  getConfig,
  authGuest,
  getMe,
  updateMe,
  putDevice,
  getDomains,
  listQuizzes,
  getQuiz,
  getGlobalDailySet,
  createSession,
  completeSession,
  getProgress,
} as const;

/** The same endpoints as a list, for whatever walks them all. */
export const endpointList: readonly Endpoint[] = Object.values(endpoints);

/**
 * Names for the schemas that appear in more than one place, or that a reader of the OpenAPI
 * document should be able to find. The generator gives each one entry under
 * `components.schemas` and points at it wherever it is used. A request or response body that
 * isn't listed is named after its endpoint.
 */
export const sharedSchemas: Readonly<Record<string, z.ZodType>> = {
  Problem: problemSchema,
  Blocks: blocksSchema,
  Question: mvpRegistry.questionSchema,
  PlayerQuestion: mvpRegistry.playerQuestionSchema,
  Answer: mvpRegistry.answerSchema,
  Grade: gradeSchema,
  ScoringConfig: scoringConfigSchema,
  TimingConfig: timingConfigSchema,
  QuestionTypeTunables: mvpRegistry.tunablesSchema,
  GameRules: gameRulesSchema,
  Config: configSchema,
  ImageAsset: imageAssetSchema,
  Renderings: renderingsSchema,
  SessionQuestion: sessionQuestionSchema,
  PlayerQuestionItem: playerQuestionItemSchema,
  SessionRules: sessionRulesSchema,
  QuestionSet: questionSetSchema,
  Player: playerSchema,
  Quiz: quizSchema,
  Progress: progressSchema,
  SessionEvaluation: sessionEvaluationSchema,
  Session: sessionSchema,
};
