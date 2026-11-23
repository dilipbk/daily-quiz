import * as z from 'zod';

// Errors are RFC 9457 problem details with a stable `code` (spec §19.2). The app shows its own
// localized message for a code, so a code never changes meaning; the titles here are English,
// for logs and tools. A code has one HTTP status, and the API answers with nothing else.

export const errorCatalog = {
  invalid_request: { status: 400, title: 'The request is not valid.' },
  idempotency_key_required: { status: 400, title: 'This request needs an Idempotency-Key header.' },
  unauthenticated: { status: 401, title: 'Sign-in is required.' },
  device_credential_invalid: { status: 401, title: 'The device credential was not accepted.' },
  forbidden: { status: 403, title: 'This is not allowed.' },
  not_found: { status: 404, title: 'Nothing was found here.' },
  daily_not_available: { status: 404, title: 'No daily set is available for this date.' },
  request_in_progress: {
    status: 409,
    title: 'A request with this Idempotency-Key is still being handled.',
  },
  session_expired: { status: 410, title: 'The session has expired.' },
  payload_too_large: { status: 413, title: 'The request body is too large.' },
  idempotency_key_reused: {
    status: 422,
    title: 'This Idempotency-Key was already used with a different request.',
  },
  rate_limited: { status: 429, title: 'Too many requests. Slow down.' },
  internal_error: { status: 500, title: 'Something went wrong on the server.' },
  service_unavailable: { status: 503, title: 'The service is unavailable for the moment.' },
} as const satisfies Record<string, { readonly status: number; readonly title: string }>;

export type ErrorCode = keyof typeof errorCatalog;

export const errorCodes = Object.keys(errorCatalog) as ErrorCode[];

/** Whether this build knows the code. A newer server may send one it doesn't. */
export function isErrorCode(code: string): code is ErrorCode {
  return Object.prototype.hasOwnProperty.call(errorCatalog, code);
}

/** The media type of every error response. */
export const problemContentType = 'application/problem+json';

/**
 * A problem as the app reads it. `code` is any snake-case word, not only the ones in the
 * catalogue, so an app older than the server can still read the status and fall back to a
 * general message. Members this build doesn't know are dropped.
 */
export const problemSchema = z.object({
  /** A URI reference for the kind of problem: `/problems/<code>`. */
  type: z.string().min(1).max(2048),
  title: z.string().min(1).max(200),
  status: z.int().min(400).max(599),
  code: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  detail: z.string().max(2000).optional(),
  instance: z.string().max(2048).optional(),
  /** The id the server logged the request under. */
  requestId: z.string().max(128).optional(),
  /** With `invalid_request`: each value that was refused, and why. */
  issues: z
    .array(
      z.object({
        path: z.array(z.union([z.string().max(200), z.int()])).max(32),
        message: z.string().max(500),
      }),
    )
    .max(100)
    .optional(),
  /** With `rate_limited` and `service_unavailable`: the `Retry-After` header, in seconds. */
  retryAfterSeconds: z.int().min(0).max(86_400).optional(),
});

export type Problem = z.infer<typeof problemSchema>;

/** A problem for a code in the catalogue, with that code's status and title. */
export function problemOf(
  code: ErrorCode,
  extras: Pick<Problem, 'detail' | 'instance' | 'requestId' | 'issues' | 'retryAfterSeconds'> = {},
): Problem {
  const { status, title } = errorCatalog[code];
  return { type: `/problems/${code}`, title, status, code, ...extras };
}
