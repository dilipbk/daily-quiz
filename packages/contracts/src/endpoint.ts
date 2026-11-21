import * as z from 'zod';
import type { ErrorCode } from './errors.ts';

// An endpoint is data: its method and path, who may call it, what it takes and what it answers.
// The app's client, the API's router, the fake server and the OpenAPI document are all driven by
// these objects, so an endpoint exists here before either side implements it (roadmap §7).
//
// Reading rules (ADR 0023): what a client sends is a strict object, so the server refuses a
// field it doesn't know. What the server answers is a plain object, so an app older than the
// server drops a field it doesn't know and carries on.

/** Who may call an endpoint. Every route declares one (roadmap §7). */
export const accessLevels = ['public', 'player', 'admin'] as const;
export type Access = (typeof accessLevels)[number];

/** The part of the API an endpoint belongs to (spec §19.3). */
export const areas = ['config', 'identity', 'content', 'dailies', 'sessions', 'progress'] as const;
export type Area = (typeof areas)[number];

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * - `none`: per-player or changing; never stored by a shared cache.
 * - `etag`: answered with an `ETag`, and with 304 to a matching `If-None-Match`. A cache asks
 *   the server every time (`Cache-Control: no-cache`), so a body is never older than its answer.
 * - `immutable`: the URL names a version, so the response never changes (roadmap §7).
 */
export type Caching = 'none' | 'etag' | 'immutable';

export interface Endpoint<
  TParams extends z.ZodObject | null = z.ZodObject | null,
  TQuery extends z.ZodObject | null = z.ZodObject | null,
  TBody extends z.ZodType | null = z.ZodType | null,
  TResponse extends z.ZodType | null = z.ZodType | null,
> {
  /** Stable and unique, `area.verb`: the name clients, logs and the OpenAPI document use. */
  readonly id: string;
  readonly area: Area;
  readonly method: Method;
  /** A path with `:name` for each parameter, as the API's router reads it. */
  readonly path: `/${string}`;
  readonly access: Access;
  /** One line, for the OpenAPI document. */
  readonly summary: string;
  /** The path parameters, one key for each `:name`. */
  readonly params: TParams;
  readonly query: TQuery;
  readonly body: TBody;
  /** Whether the request must carry an `Idempotency-Key` header (spec §19.2). */
  readonly idempotencyKey: boolean;
  readonly caching: Caching;
  readonly success: { readonly status: 200 | 201 | 204; readonly body: TResponse };
  /**
   * The codes this endpoint answers with, beyond the ones any endpoint can: a refused request,
   * a missing sign-in, a rate limit and a server fault.
   */
  readonly errors: readonly ErrorCode[];
}

/** Returns the endpoint as given. It exists so the four type parameters are inferred. */
export function defineEndpoint<
  TParams extends z.ZodObject | null,
  TQuery extends z.ZodObject | null,
  TBody extends z.ZodType | null,
  TResponse extends z.ZodType | null,
>(
  endpoint: Endpoint<TParams, TQuery, TBody, TResponse>,
): Endpoint<TParams, TQuery, TBody, TResponse> {
  return endpoint;
}

type Parsed<Schema> = Schema extends z.ZodType ? z.output<Schema> : undefined;

/** What an endpoint's path parameters parse to, or `undefined` when it has none. */
export type ParamsOf<E extends Endpoint> = Parsed<E['params']>;
export type QueryOf<E extends Endpoint> = Parsed<E['query']>;
export type BodyOf<E extends Endpoint> = Parsed<E['body']>;
/** What a successful response parses to, or `undefined` when it has no body. */
export type ResponseOf<E extends Endpoint> = Parsed<E['success']['body']>;

/** The headers the contract rules name (spec §19.2), each spelled once. */
export const headerNames = {
  idempotencyKey: 'Idempotency-Key',
  ifNoneMatch: 'If-None-Match',
  etag: 'ETag',
  retryAfter: 'Retry-After',
} as const;

/**
 * What a client sends as `Idempotency-Key`: a value it made once, stored with the request in its
 * outbox and repeats on every retry (OFF-03). A UUID fits.
 */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
