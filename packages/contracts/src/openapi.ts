import * as z from 'zod';
import { headerNames, idempotencyKeySchema } from './endpoint.ts';
import type { Access, Endpoint } from './endpoint.ts';
import { errorCatalog, problemContentType, problemSchema } from './errors.ts';
import type { ErrorCode } from './errors.ts';

// The OpenAPI 3.1 document, generated from the endpoint registry (ADR 0023). A pure function: it
// reads endpoints and schemas and returns plain JSON. The schemas are converted by zod's own
// `z.toJSONSchema`, whose default target, JSON Schema 2020-12, is the dialect OpenAPI 3.1 uses.
//
// Schemas are converted as their input side: what each parser accepts. So a request body is a
// closed object and a response is an open one, which is the reading rule of ./endpoint.ts. A
// refinement can't be written in JSON Schema and is left out: the document describes shapes, and
// the zod schemas remain the contract.

/** The latest patch of OpenAPI 3.1 (checked 2026-11-21). */
const openApiVersion = '3.1.2';

type JsonObject = Record<string, unknown>;

export interface OpenApiDocument {
  readonly openapi: string;
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
  };
  readonly servers?: readonly { readonly url: string; readonly description?: string }[];
  readonly tags: readonly { readonly name: string }[];
  /** By path, then by lowercase method. */
  readonly paths: Readonly<Record<string, Readonly<Record<string, JsonObject>>>>;
  readonly components: {
    readonly schemas: Readonly<Record<string, JsonObject>>;
    readonly securitySchemes: Readonly<Record<string, JsonObject>>;
  };
}

export interface OpenApiOptions {
  readonly endpoints: readonly Endpoint[];
  /** Names for schemas to list under `components.schemas`, such as `sharedSchemas`. */
  readonly schemas: Readonly<Record<string, z.ZodType>>;
  readonly info: OpenApiDocument['info'];
  readonly servers?: OpenApiDocument['servers'];
}

const conversion = { target: 'draft-2020-12', io: 'input', unrepresentable: 'throw' } as const;

const componentRef = (name: string): string => `#/components/schemas/${name}`;

/** A converted schema without the two keys that only a JSON Schema document of its own carries. */
const withoutDocumentKeys = (schema: JsonObject): JsonObject =>
  Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$schema' && key !== '$id'));

/** A schema on its own, with no named parts: a parameter or a header. */
const inlineSchemaOf = (schema: z.ZodType): JsonObject =>
  withoutDocumentKeys(z.toJSONSchema(schema, conversion));

/** `sessions.complete` becomes `SessionsComplete`. */
const pascalCase = (id: string): string =>
  id
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/** `/sessions/:sessionId/complete` becomes `/sessions/{sessionId}/complete`. */
const openApiPath = (path: string): string => path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, '{$1}');

const pathNames = (path: string): string[] =>
  [...path.matchAll(/:([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1] ?? '');

const securitySchemeOf: Readonly<Record<Exclude<Access, 'public'>, string>> = {
  player: 'playerSession',
  admin: 'adminSession',
};

const securitySchemes: Readonly<Record<string, JsonObject>> = {
  playerSession: {
    type: 'http',
    scheme: 'bearer',
    description: "The player's session token, from POST /auth/guest or sign-in.",
  },
  adminSession: {
    type: 'http',
    scheme: 'bearer',
    description: 'The session of a signed-in member of staff.',
  },
};

/** The parameters of one kind, read from the object schema that holds them. */
function parametersOf(schema: z.ZodObject | null, location: 'path' | 'query'): JsonObject[] {
  if (schema === null) return [];

  const { properties = {}, required = [] } = z.toJSONSchema(schema, conversion);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: location,
    required: location === 'path' || required.includes(name),
    schema: property,
  }));
}

/** Every code an endpoint can answer with: the ones it lists, and the ones any endpoint can. */
function errorCodesOf(endpoint: Endpoint): ErrorCode[] {
  const takesInput = endpoint.params !== null || endpoint.query !== null || endpoint.body !== null;
  const implied: ErrorCode[] = [
    ...(takesInput ? (['invalid_request'] as const) : []),
    ...(endpoint.access === 'public' ? [] : (['unauthenticated'] as const)),
    ...(endpoint.access === 'admin' ? (['forbidden'] as const) : []),
    'rate_limited',
    'internal_error',
    'service_unavailable',
  ];
  return [...new Set([...implied, ...endpoint.errors])];
}

/** One response for each status, naming every code that carries it. */
function errorResponsesOf(endpoint: Endpoint, problemName: string): Record<string, JsonObject> {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of errorCodesOf(endpoint)) {
    const { status } = errorCatalog[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }

  const retryAfter = {
    [headerNames.retryAfter]: {
      description: 'Seconds to wait before trying again.',
      schema: { type: 'integer', minimum: 0 },
    },
  };

  return Object.fromEntries(
    [...byStatus.entries()]
      .sort(([a], [b]) => a - b)
      .map(([status, codes]) => [
        String(status),
        {
          description: codes.map((code) => `${code}: ${errorCatalog[code].title}`).join(' '),
          'x-error-codes': codes,
          ...(codes.includes('rate_limited') || codes.includes('service_unavailable')
            ? { headers: retryAfter }
            : {}),
          content: { [problemContentType]: { schema: { $ref: componentRef(problemName) } } },
        },
      ]),
  );
}

/**
 * The OpenAPI 3.1 document for a list of endpoints.
 *
 * Throws when a schema can't be written as JSON Schema (a `Date`, a `bigint`), when two
 * schemas would take one name or one schema two, when two endpoints share an id or a route, when
 * a path's `:names` and its params schema differ, or when a 204 has a body. Each is a mistake in
 * the registry, found when the document is built.
 */
export function generateOpenApi(options: OpenApiOptions): OpenApiDocument {
  const registry = z.registry<{ id: string }>();
  const names = new Map<z.ZodType, string>();

  /** The name a schema is listed under: the one it already has, or the one proposed. */
  const nameOf = (schema: z.ZodType, proposed: string): string => {
    const existing = names.get(schema);
    if (existing !== undefined) return existing;
    if ([...names.values()].includes(proposed)) {
      throw new Error(`Two schemas would be named "${proposed}" in the OpenAPI document.`);
    }
    names.set(schema, proposed);
    registry.add(schema, { id: proposed });
    return proposed;
  };

  for (const [name, schema] of Object.entries(options.schemas)) {
    if (nameOf(schema, name) !== name) {
      throw new Error(`One schema is listed as "${nameOf(schema, name)}" and as "${name}".`);
    }
  }
  const problemName = nameOf(problemSchema, 'Problem');

  const paths: Record<string, Record<string, JsonObject>> = {};
  const tags: string[] = [];
  const ids = new Set<string>();
  /** Each method with its path, every parameter written alike: `/a/:x` and `/a/:y` are one route. */
  const routes = new Set<string>();

  for (const endpoint of options.endpoints) {
    const { id, params, query, body, success } = endpoint;

    if (ids.has(id)) throw new Error(`Two endpoints have the id "${id}".`);
    ids.add(id);

    const route = `${endpoint.method} ${endpoint.path.replace(/:[A-Za-z][A-Za-z0-9]*/g, '{}')}`;
    if (routes.has(route)) {
      throw new Error(`Two endpoints answer ${endpoint.method} ${endpoint.path}.`);
    }
    routes.add(route);

    if ((success.status === 204) !== (success.body === null)) {
      throw new Error(`"${id}" must answer 204 with no body, or another status with one.`);
    }

    const inPath = pathNames(endpoint.path).sort();
    const inSchema = Object.keys(params?.shape ?? {}).sort();
    if (inPath.join() !== inSchema.join()) {
      throw new Error(`The path of "${id}" and its params schema name different parameters.`);
    }

    const headers: JsonObject[] = [
      ...(endpoint.idempotencyKey
        ? [
            {
              name: headerNames.idempotencyKey,
              in: 'header',
              required: true,
              description:
                'A value the client makes once for this request and repeats on every retry.',
              schema: inlineSchemaOf(idempotencyKeySchema),
            },
          ]
        : []),
      ...(endpoint.caching === 'none'
        ? []
        : [
            {
              name: headerNames.ifNoneMatch,
              in: 'header',
              required: false,
              description: 'The ETag of the copy the client holds.',
              schema: { type: 'string' },
            },
          ]),
    ];

    const cached =
      endpoint.caching === 'none'
        ? {}
        : {
            headers: {
              [headerNames.etag]: {
                description:
                  endpoint.caching === 'immutable'
                    ? 'The version this URL names. The response never changes.'
                    : 'The version of this response.',
                schema: { type: 'string' },
              },
              'Cache-Control': {
                description:
                  endpoint.caching === 'immutable'
                    ? 'public, immutable: the URL names a version.'
                    : 'no-cache: a cache asks the server before it reuses a copy.',
                schema: { type: 'string' },
              },
            },
          };

    const operation: JsonObject = {
      operationId: id,
      tags: [endpoint.area],
      summary: endpoint.summary,
      'x-access': endpoint.access,
      security: endpoint.access === 'public' ? [] : [{ [securitySchemeOf[endpoint.access]]: [] }],
      parameters: [...parametersOf(params, 'path'), ...parametersOf(query, 'query'), ...headers],
      ...(body === null
        ? {}
        : {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: componentRef(nameOf(body, `${pascalCase(id)}Request`)) },
                },
              },
            },
          }),
      responses: {
        [String(success.status)]:
          success.body === null
            ? { description: 'Done. The response has no body.' }
            : {
                description: 'Success.',
                ...cached,
                content: {
                  'application/json': {
                    schema: {
                      $ref: componentRef(nameOf(success.body, `${pascalCase(id)}Response`)),
                    },
                  },
                },
              },
        ...(endpoint.caching === 'none'
          ? {}
          : {
              '304': {
                description: 'Not modified: the copy the client holds is current.',
                ...cached,
              },
            }),
        ...errorResponsesOf(endpoint, problemName),
      },
    };

    const operations = (paths[openApiPath(endpoint.path)] ??= {});
    operations[endpoint.method.toLowerCase()] = operation;
    if (!tags.includes(endpoint.area)) tags.push(endpoint.area);
  }

  // Every schema named above, converted in one call so that each points at the others by name.
  const converted = z.toJSONSchema(registry, { ...conversion, uri: componentRef }).schemas;
  if ('__shared' in converted) {
    throw new Error(
      'zod set a schema apart without a name: it refers to itself, or it is used in several places and carries its own id. Give it a name in the schemas option.',
    );
  }
  const schemas = Object.fromEntries(
    Object.entries(converted).map(([name, schema]) => [name, withoutDocumentKeys(schema)]),
  );

  const usedSchemes = new Set(
    options.endpoints.flatMap(({ access }) =>
      access === 'public' ? [] : [securitySchemeOf[access]],
    ),
  );

  return {
    openapi: openApiVersion,
    info: options.info,
    ...(options.servers === undefined ? {} : { servers: options.servers }),
    tags: tags.map((name) => ({ name })),
    paths,
    components: {
      schemas,
      securitySchemes: Object.fromEntries(
        Object.entries(securitySchemes).filter(([name]) => usedSchemes.has(name)),
      ),
    },
  };
}
