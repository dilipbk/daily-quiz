import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod';
import { defineEndpoint, headerNames, idempotencyKeySchema } from '../src/endpoint.ts';
import type { BodyOf, ParamsOf, QueryOf, ResponseOf } from '../src/endpoint.ts';
import { idSchema } from '../src/primitives.ts';

// An endpoint is data: what the client sends, what the server answers and who may call it. The
// client, the API and the fake server all read the same object (roadmap §3.1).

const toy = defineEndpoint({
  id: 'toys.rename',
  area: 'content',
  method: 'PUT',
  path: '/toys/:toyId',
  access: 'player',
  summary: 'Rename a toy.',
  params: z.strictObject({ toyId: idSchema }),
  query: null,
  body: z.strictObject({ name: z.string() }),
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: z.object({ toyId: idSchema, name: z.string() }) },
  errors: ['not_found'],
});

describe('an endpoint', () => {
  // App binaries lag the server: a field added to a response must not break a shipped app, and
  // a field the server doesn't know is a client bug it should hear about.
  it('a response object drops a field it does not know and a request object refuses one', () => {
    expect(toy.success.body.parse({ toyId: 't1', name: 'Rex', addedLater: true })).toEqual({
      toyId: 't1',
      name: 'Rex',
    });
    expect(toy.body.safeParse({ name: 'Rex', addedLater: true }).success).toBe(false);
    expect(toy.params.safeParse({ toyId: 't1', other: 'x' }).success).toBe(false);
  });

  it('ParamsOf, QueryOf, BodyOf and ResponseOf infer what the schemas parse to', () => {
    expectTypeOf<ParamsOf<typeof toy>>().toEqualTypeOf<{ toyId: string }>();
    expectTypeOf<QueryOf<typeof toy>>().toEqualTypeOf<undefined>();
    expectTypeOf<BodyOf<typeof toy>>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<ResponseOf<typeof toy>>().toEqualTypeOf<{ toyId: string; name: string }>();
  });

  it('defineEndpoint returns the endpoint as given', () => {
    expect(toy.id).toBe('toys.rename');
    expect(toy.errors).toEqual(['not_found']);
  });
});

describe('headers', () => {
  it('an idempotency key is 16 to 64 URL-safe characters, which a UUID is', () => {
    expect(idempotencyKeySchema.safeParse('0193a1b2-7c3d-7e4f-8a5b-6c7d8e9f0a1b').success).toBe(
      true,
    );

    expect(idempotencyKeySchema.safeParse('short').success).toBe(false);
    expect(idempotencyKeySchema.safeParse('k'.repeat(65)).success).toBe(false);
    expect(idempotencyKeySchema.safeParse('has spaces in the key').success).toBe(false);
  });

  it('header names are spelled once', () => {
    expect(headerNames).toEqual({
      idempotencyKey: 'Idempotency-Key',
      ifNoneMatch: 'If-None-Match',
      etag: 'ETag',
      retryAfter: 'Retry-After',
    });
  });
});
