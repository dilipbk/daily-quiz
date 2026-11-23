import { describe, expect, it } from 'vitest';
import { errorCatalog, errorCodes, isErrorCode, problemOf, problemSchema } from '../src/errors.ts';

// Errors are RFC 9457 problem details with a stable `code` (spec §19.2). The app shows its own
// localized message for a code, so a code never changes meaning and an unknown one must parse.

describe('the error catalogue', () => {
  it('every code has one status and a title', () => {
    expect(errorCodes).toHaveLength(14);
    expect(new Set(errorCodes).size).toBe(errorCodes.length);

    for (const code of errorCodes) {
      const { status, title } = errorCatalog[code];
      expect(code, code).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(status, code).toBeGreaterThanOrEqual(400);
      expect(status, code).toBeLessThan(600);
      expect(title.trim(), code).not.toBe('');
    }
  });

  it('the codes the §19.2 rules name carry the statuses HTTP gives them', () => {
    expect(errorCatalog.rate_limited.status).toBe(429);
    expect(errorCatalog.unauthenticated.status).toBe(401);
    expect(errorCatalog.idempotency_key_reused.status).toBe(422);
    expect(errorCatalog.payload_too_large.status).toBe(413);
  });

  it('isErrorCode knows the catalogue and nothing an object inherits', () => {
    expect(isErrorCode('rate_limited')).toBe(true);
    expect(isErrorCode('teapot')).toBe(false);
    expect(isErrorCode('constructor')).toBe(false);
    expect(isErrorCode('toString')).toBe(false);
  });
});

describe('problem details', () => {
  it('problemOf builds a problem from the catalogue, and it parses', () => {
    const problem = problemOf('rate_limited', { retryAfterSeconds: 30, requestId: 'req_1' });

    expect(problem).toEqual({
      type: '/problems/rate_limited',
      title: errorCatalog.rate_limited.title,
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds: 30,
      requestId: 'req_1',
    });
    expect(problemSchema.parse(problem)).toEqual(problem);
  });

  it('a problem with a code this build does not know still parses', () => {
    const fromANewerServer = {
      type: '/problems/league_closed',
      title: 'The league has closed.',
      status: 409,
      code: 'league_closed',
    };

    expect(problemSchema.parse(fromANewerServer)).toEqual(fromANewerServer);
  });

  it('a problem keeps extension members out of the parsed value', () => {
    const parsed = problemSchema.parse({ ...problemOf('not_found'), balance: 30, accounts: ['a'] });

    expect(parsed).toEqual(problemOf('not_found'));
  });

  it('a problem needs a type, a title, an error status and a code', () => {
    const withoutCode = { type: '/problems/not_found', title: 'Nothing was found.', status: 404 };

    expect(problemSchema.safeParse(withoutCode).success).toBe(false);
    expect(problemSchema.safeParse({ ...withoutCode, code: 'not_found' }).success).toBe(true);
    expect(problemSchema.safeParse({ ...problemOf('not_found'), status: 200 }).success).toBe(false);
    expect(problemSchema.safeParse({ ...problemOf('not_found'), code: 'Not Found' }).success).toBe(
      false,
    );
  });

  it('validation issues say where and why', () => {
    const problem = problemOf('invalid_request', {
      issues: [{ path: ['answers', 2, 'elapsedMs'], message: 'Expected a whole number.' }],
    });

    expect(problemSchema.parse(problem)).toEqual(problem);
  });
});
