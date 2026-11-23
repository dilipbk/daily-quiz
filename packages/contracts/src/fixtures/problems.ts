import { errorCodes, problemOf } from '../errors.ts';
import type { ErrorCode, Problem } from '../errors.ts';

/** What some codes carry beyond their status and title. */
const extras: Partial<Record<ErrorCode, Parameters<typeof problemOf>[1]>> = {
  invalid_request: {
    detail: 'The request body did not match the contract.',
    requestId: 'req_01JD6K2Q8Z',
    issues: [
      { path: ['answers', 2, 'elapsedMs'], message: 'Expected a whole number.' },
      { path: ['timeZone'], message: 'Expected an IANA time-zone id.' },
    ],
  },
  rate_limited: { retryAfterSeconds: 30, requestId: 'req_01JD6K2Q90' },
  service_unavailable: { retryAfterSeconds: 120 },
  internal_error: { requestId: 'req_01JD6K2Q91' },
};

/** One problem for every code in the catalogue, as the API would answer with it. */
export const problemFixtures: Readonly<Record<ErrorCode, Problem>> = Object.fromEntries(
  errorCodes.map((code) => [code, problemOf(code, extras[code])]),
) as Record<ErrorCode, Problem>;
