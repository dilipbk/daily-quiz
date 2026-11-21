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
