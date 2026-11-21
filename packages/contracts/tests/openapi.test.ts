import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { defineEndpoint } from '../src/endpoint.ts';
import type { Endpoint } from '../src/endpoint.ts';
import { endpointList, sharedSchemas } from '../src/endpoints.ts';
import { generateOpenApi } from '../src/openapi.ts';
import { idSchema } from '../src/primitives.ts';

// The first half of ENG-04's done-when: the registry generates OpenAPI 3.1. These read the
// document's structure; tests/node/openapi-validity.test.ts checks it against the standard.

const info = { title: 'Daily quiz API', version: '0.0.0' };

const document = generateOpenApi({ endpoints: endpointList, schemas: sharedSchemas, info });

const openApiPath = (path: string): string => path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, '{$1}');

interface Parameter {
  name: string;
  in: string;
  required: boolean;
  schema: Record<string, unknown>;
}

interface Operation {
  operationId: string;
  tags: string[];
  security: Record<string, string[]>[];
  parameters: Parameter[];
  requestBody?: { content: Record<string, { schema: { $ref: string } }> };
  responses: Record<
    string,
    {
      description: string;
      'x-error-codes'?: string[];
      headers?: Record<string, unknown>;
      content?: Record<string, { schema: { $ref: string } }>;
    }
  >;
}

const operationOf = (endpoint: Endpoint): Operation => {
  const operation = document.paths[openApiPath(endpoint.path)]?.[endpoint.method.toLowerCase()];
  if (operation === undefined) throw new Error(`No operation for ${endpoint.id}.`);
  return operation as unknown as Operation;
};

const endpointNamed = (id: string): Endpoint => {
  const endpoint = endpointList.find((candidate) => candidate.id === id);
  if (endpoint === undefined) throw new Error(`No endpoint has the id ${id}.`);
  return endpoint;
};

/** Every `$ref` anywhere in a value. */
const refsIn = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(refsIn);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    key === '$ref' && typeof inner === 'string' ? [inner] : refsIn(inner),
  );
};

const toy = (overrides: Partial<Endpoint>): Endpoint => ({
  ...defineEndpoint({
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
    success: { status: 200, body: z.object({ name: z.string() }) },
    errors: [],
  }),
  ...overrides,
});

describe('the OpenAPI document', () => {
  it('is OpenAPI 3.1, with the title and version it was given', () => {
    expect(document.openapi).toBe('3.1.2');
    expect(document.info).toEqual(info);
    expect(document.tags.map((tag) => tag.name)).toEqual([
      'config',
      'identity',
      'content',
      'dailies',
      'sessions',
      'progress',
    ]);
  });

  it('every endpoint in the registry is an operation in the document', () => {
    for (const endpoint of endpointList) {
      expect(operationOf(endpoint).operationId, endpoint.id).toBe(endpoint.id);
      expect(operationOf(endpoint).tags, endpoint.id).toEqual([endpoint.area]);
    }

    const operations = Object.values(document.paths).flatMap((methods) => Object.keys(methods));
    expect(operations).toHaveLength(endpointList.length);
  });

  it('every $ref resolves', () => {
    const refs = refsIn(document);

    expect(refs.length).toBeGreaterThan(30);
    for (const ref of refs) {
      expect(ref, ref).toMatch(/^#\/components\/schemas\/[A-Za-z0-9]+$/);
      expect(document.components.schemas, ref).toHaveProperty(
        ref.replace('#/components/schemas/', ''),
      );
    }
  });

  it('a schema carries no $schema or $id of its own, and none is left unnamed', () => {
    for (const [name, schema] of Object.entries(document.components.schemas)) {
      expect(schema, name).not.toHaveProperty('$schema');
      expect(schema, name).not.toHaveProperty('$id');
    }
    expect(document.components.schemas).not.toHaveProperty('__shared');
  });

  it(':param becomes {param} and is a required path parameter', () => {
    expect(Object.keys(document.paths)).toContain('/sessions/{sessionId}/complete');
    expect(Object.keys(document.paths)).toContain('/daily/global/{date}/{contentVersion}');
    expect(Object.keys(document.paths).join()).not.toContain(':');

    const inPath = operationOf(endpointNamed('dailies.globalSet')).parameters.filter(
      (parameter) => parameter.in === 'path',
    );
    expect(inPath.map((parameter) => parameter.name)).toEqual(['date', 'contentVersion']);
    expect(inPath.every((parameter) => parameter.required)).toBe(true);
    expect(inPath[0]?.schema).toMatchObject({ type: 'string', format: 'date' });
  });

  it('query parameters are optional unless the schema requires them, and limit is an integer', () => {
    const quizzes = operationOf(endpointNamed('content.quizzes')).parameters;
    const progress = operationOf(endpointNamed('progress.get')).parameters;

    expect(quizzes.filter((parameter) => parameter.in === 'query')).toEqual([
      expect.objectContaining({ name: 'domain', required: false }),
      expect.objectContaining({ name: 'topic', required: false }),
      expect.objectContaining({ name: 'cursor', required: false }),
      expect.objectContaining({
        name: 'limit',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 50 },
      }),
    ]);
    expect(progress).toContainEqual(expect.objectContaining({ name: 'timeZone', required: true }));
  });

  it('an idempotent endpoint requires the Idempotency-Key header, and no other endpoint names it', () => {
    for (const endpoint of endpointList) {
      const header = operationOf(endpoint).parameters.find(
        (parameter) => parameter.name === 'Idempotency-Key',
      );

      if (endpoint.idempotencyKey)
        expect(header, endpoint.id).toMatchObject({ in: 'header', required: true });
      else expect(header, endpoint.id).toBeUndefined();
    }
    expect(endpointNamed('sessions.complete').idempotencyKey).toBe(true);
  });

  it('every operation documents 429 with Retry-After, as a problem', () => {
    for (const endpoint of endpointList) {
      const tooMany = operationOf(endpoint).responses['429'];

      expect(tooMany?.['x-error-codes'], endpoint.id).toEqual(['rate_limited']);
      expect(tooMany?.headers, endpoint.id).toHaveProperty('Retry-After');
      expect(tooMany?.content, endpoint.id).toEqual({
        'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
      });
    }
  });

  it('a public operation asks for no credentials and a player one for the player session', () => {
    for (const endpoint of endpointList) {
      const { security, responses } = operationOf(endpoint);

      if (endpoint.access === 'public') {
        expect(security, endpoint.id).toEqual([]);
        expect(responses['401']?.['x-error-codes'] ?? [], endpoint.id).not.toContain(
          'unauthenticated',
        );
      } else {
        expect(security, endpoint.id).toEqual([{ playerSession: [] }]);
        expect(responses['401']?.['x-error-codes'], endpoint.id).toContain('unauthenticated');
      }
    }
    expect(Object.keys(document.components.securitySchemes)).toEqual(['playerSession']);
  });

  it('each error status is one response that names every code it carries', () => {
    const { responses } = operationOf(endpointNamed('sessions.complete'));

    expect(Object.keys(responses)).toEqual([
      '200',
      '400',
      '401',
      '404',
      '409',
      '410',
      '413',
      '422',
      '429',
      '500',
      '503',
    ]);
    expect(responses['400']?.['x-error-codes']).toEqual([
      'invalid_request',
      'idempotency_key_required',
    ]);
    expect(responses['422']?.['x-error-codes']).toEqual(['idempotency_key_reused']);
    expect(responses['503']?.headers).toHaveProperty('Retry-After');
  });

  it('an endpoint with no input documents no invalid_request', () => {
    expect(operationOf(endpointNamed('config.get')).responses).not.toHaveProperty('400');
    expect(operationOf(endpointNamed('me.get')).responses).not.toHaveProperty('400');
  });

  it('a cached endpoint documents its ETag, If-None-Match and 304', () => {
    for (const endpoint of endpointList) {
      const { parameters, responses } = operationOf(endpoint);
      const sendsIfNoneMatch = parameters.some((parameter) => parameter.name === 'If-None-Match');

      expect(sendsIfNoneMatch, endpoint.id).toBe(endpoint.caching !== 'none');
      expect('304' in responses, endpoint.id).toBe(endpoint.caching !== 'none');
    }
    expect(operationOf(endpointNamed('config.get')).responses['200']?.headers).toHaveProperty(
      'ETag',
    );
  });

  it('a response with no body is a 204 with no content', () => {
    const { responses } = operationOf(endpointNamed('devices.put'));

    expect(responses['204']).toEqual({ description: 'Done. The response has no body.' });
    expect(responses).not.toHaveProperty('200');
  });

  it('bodies are named after their endpoint unless they are shared, and point at shared parts', () => {
    const { schemas } = document.components;
    const complete = operationOf(endpointNamed('sessions.complete'));

    expect(complete.requestBody?.content['application/json']?.schema.$ref).toBe(
      '#/components/schemas/SessionsCompleteRequest',
    );
    expect(complete.responses['200']?.content?.['application/json']?.schema.$ref).toBe(
      '#/components/schemas/SessionsCompleteResponse',
    );
    expect(
      operationOf(endpointNamed('me.update')).responses['200']?.content?.['application/json']
        ?.schema.$ref,
    ).toBe('#/components/schemas/Player');

    expect(schemas.SessionQuestion).toMatchObject({
      properties: {
        question: { $ref: '#/components/schemas/Question' },
        prompt: { $ref: '#/components/schemas/Blocks' },
        renderings: { $ref: '#/components/schemas/Renderings' },
      },
    });
    expect(schemas.SessionsCompleteResponse).toMatchObject({
      properties: {
        progress: { $ref: '#/components/schemas/Progress' },
        evaluation: { $ref: '#/components/schemas/SessionEvaluation' },
      },
    });
  });

  it('a request body is a closed object and a response is an open one', () => {
    const { schemas } = document.components;

    expect(schemas.SessionsCompleteRequest).toMatchObject({ additionalProperties: false });
    expect(schemas.AuthGuestRequest).toMatchObject({ additionalProperties: false });
    expect(schemas.Progress).not.toHaveProperty('additionalProperties');
    expect(schemas.Config).not.toHaveProperty('additionalProperties');
  });

  it('the document is plain JSON and the same on every run', () => {
    const again = generateOpenApi({ endpoints: endpointList, schemas: sharedSchemas, info });

    expect(JSON.parse(JSON.stringify(document))).toStrictEqual(document);
    expect(JSON.stringify(again)).toBe(JSON.stringify(document));
  });

  it('servers are listed when given, and left out when not', () => {
    const servers = [{ url: 'https://api.staging.example.org', description: 'Staging' }];
    const withServers = generateOpenApi({ endpoints: [], schemas: {}, info, servers });

    expect(withServers.servers).toEqual(servers);
    expect(document).not.toHaveProperty('servers');
    expect(withServers.paths).toEqual({});
    expect(Object.keys(withServers.components.schemas)).toEqual(['Problem']);
  });
});

describe('a registry the generator refuses', () => {
  const generate = (endpoints: Endpoint[], schemas: Record<string, z.ZodType> = {}) =>
    generateOpenApi({ endpoints, schemas, info });

  it('generates for a sound endpoint', () => {
    const { paths, components } = generate([toy({})]);

    expect(Object.keys(paths)).toEqual(['/toys/{toyId}']);
    expect(Object.keys(components.schemas).sort()).toEqual([
      'Problem',
      'ToysRenameRequest',
      'ToysRenameResponse',
    ]);
  });

  it('a schema that can’t be represented throws', () => {
    const big = toy({ body: z.strictObject({ count: z.bigint() }) });
    const dated = toy({ success: { status: 200, body: z.object({ at: z.date() }) } });

    expect(() => generate([big])).toThrow(/cannot be represented/i);
    expect(() => generate([dated])).toThrow(/cannot be represented/i);
  });

  it('two schemas that would take one name throw', () => {
    expect(() => generate([toy({})], { ToysRenameRequest: z.string() })).toThrow(
      'Two schemas would be named "ToysRenameRequest"',
    );
  });

  it('a path and a params schema that disagree throw', () => {
    expect(() => generate([toy({ path: '/toys/:id' })])).toThrow('name different parameters');
    expect(() => generate([toy({ params: null })])).toThrow('name different parameters');
  });

  it('two endpoints on one method and path throw', () => {
    expect(() => generate([toy({}), toy({ id: 'toys.replace' })])).toThrow(
      'Two endpoints answer PUT /toys/:toyId',
    );
  });

  it('an admin endpoint asks for the admin session and can answer forbidden', () => {
    const { paths, components } = generate([toy({ access: 'admin' })]);
    const operation = paths['/toys/{toyId}']?.put as unknown as Operation;

    expect(operation.security).toEqual([{ adminSession: [] }]);
    expect(operation.responses['403']?.['x-error-codes']).toEqual(['forbidden']);
    expect(Object.keys(components.securitySchemes)).toEqual(['adminSession']);
  });
});
