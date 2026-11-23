// The public API of @repo/contracts: the wire shapes of the API as zod schemas, the endpoint
// registry, and the error catalogue (spec §19.2, §19.3). Re-exports only, each by name. Fixtures
// are a second entry point, `@repo/contracts/fixtures`, and the OpenAPI generator a third,
// `@repo/contracts/openapi`, so neither is bundled into the app by accident.

export {
  appVersionSchema,
  countSchema,
  cursorSchema,
  httpsUrlSchema,
  idSchema,
  isoTimestampSchema,
  localDateSchema,
  localeSchema,
  maxPageSize,
  pageOf,
  pageQueryShape,
  platformSchema,
  queryIntegerSchema,
  slugSchema,
  timeZoneSchema,
  utcOffsetMinutesSchema,
} from './primitives.ts';
export type { Platform } from './primitives.ts';

export {
  errorCatalog,
  errorCodes,
  isErrorCode,
  problemContentType,
  problemOf,
  problemSchema,
} from './errors.ts';
export type { ErrorCode, Problem } from './errors.ts';

export {
  accessLevels,
  areas,
  defineEndpoint,
  headerNames,
  idempotencyKeySchema,
} from './endpoint.ts';
export type {
  Access,
  Area,
  BodyOf,
  Caching,
  Endpoint,
  Method,
  ParamsOf,
  QueryOf,
  ResponseOf,
} from './endpoint.ts';

export { endpointList, endpoints, sharedSchemas } from './endpoints.ts';

export {
  dailyGoalTierSchema,
  gameRulesSchema,
  playModeSchema,
  sessionSourceSchema,
} from './rules.ts';
export type { DailyGoalTier, GameRules, PlayMode, SessionSource } from './rules.ts';

export { maxSvgLength, svgProblem } from './svg.ts';

export {
  assetOf,
  audioAssetSchema,
  codeRenderingOf,
  codeRenderingSchema,
  codeTokenKinds,
  imageAssetSchema,
  mathRenderingOf,
  mathRenderingSchema,
  mediaAssetSchema,
  renderingsSchema,
  unrenderedBlocks,
} from './published.ts';
export type {
  AudioAsset,
  CodeRendering,
  CodeTokenKind,
  ImageAsset,
  MathRendering,
  MediaAsset,
  Renderings,
} from './published.ts';

export {
  maxSessionQuestions,
  playerQuestionItemSchema,
  questionSetSchema,
  sessionQuestionSchema,
  sessionRulesSchema,
  toPlayerQuestionItem,
} from './questions.ts';
export type {
  PlayerQuestionItem,
  QuestionSet,
  SessionQuestion,
  SessionRules,
} from './questions.ts';

export { configCoreSchema, configSchema } from './areas/config.ts';
export type { Config, ConfigCore } from './areas/config.ts';

export {
  deviceParamsSchema,
  deviceSchema,
  guestRequestSchema,
  guestResponseSchema,
  playerSchema,
  updatePlayerSchema,
} from './areas/identity.ts';
export type {
  Device,
  GuestRequest,
  GuestResponse,
  Player,
  UpdatePlayer,
} from './areas/identity.ts';

export {
  domainSchema,
  domainsSchema,
  quizPageSchema,
  quizParamsSchema,
  quizSchema,
  quizzesQuerySchema,
} from './areas/content.ts';
export type { Domain, Domains, Quiz, QuizPage } from './areas/content.ts';

export { dailySetSchema, globalSetParamsSchema } from './areas/dailies.ts';
export type { DailySet } from './areas/dailies.ts';

export { progressQuerySchema, progressSchema, streakStatusSchema } from './areas/progress.ts';
export type { Progress, StreakStatus } from './areas/progress.ts';

export {
  completionResultSchema,
  completionSchema,
  createSessionSchema,
  sessionEvaluationSchema,
  sessionItemsOf,
  sessionParamsSchema,
  sessionSchema,
} from './areas/sessions.ts';
export type {
  Completion,
  CompletionResult,
  CreateSession,
  Session,
  SessionItemsResult,
} from './areas/sessions.ts';
