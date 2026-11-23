import { Validator } from '@seriousme/openapi-schema-validator';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import type { Endpoint } from '../../src/endpoint.ts';
import { endpointList, sharedSchemas } from '../../src/endpoints.ts';
import { fixtures } from '../../src/fixtures/index.ts';
import type { Fixture } from '../../src/fixtures/index.ts';
import { generateOpenApi } from '../../src/openapi.ts';

// ENG-04's done-when, checked from outside: the generated document is valid OpenAPI 3.1 by the
// standard's own schema, every schema in it compiles as JSON Schema 2020-12, and every fixture
// that parses with its zod schema also validates against the schema the document publishes for
// it. The two libraries are development dependencies of this test and nothing else.

const document = generateOpenApi({
  endpoints: endpointList,
  schemas: sharedSchemas,
  info: { title: 'Daily quiz API', version: '0.0.0' },
});

const documentUri = 'openapi.json';

// Formats are left to zod: `date-time` and `date` also arrive as patterns, which are checked.
const ajv = new Ajv2020({ strict: false, validateFormats: false, allErrors: true });
ajv.addSchema(document, documentUri);

const openApiPath = (path: string): string => path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, '{$1}');

interface Operation {
  parameters: { name: string; in: string; schema: Record<string, unknown> }[];
  requestBody?: { content: Record<string, { schema: { $ref: string } }> };
  responses: Record<string, { content?: Record<string, { schema: { $ref: string } }> }>;
}

const operationOf = (endpoint: Endpoint): Operation =>
  document.paths[openApiPath(endpoint.path)]?.[
    endpoint.method.toLowerCase()
  ] as unknown as Operation;

/** Validates a value against a schema that lives inside the document. */
const validateAgainst = (ref: string, value: unknown): string | null => {
  const validate = ajv.compile({ $ref: `${documentUri}${ref}` });
  return validate(value) ? null : ajv.errorsText(validate.errors);
};

/** The problems found when a fixture is held against what the document says about its endpoint. */
function problemsOf(fixture: Fixture, endpoint: Endpoint): string[] {
  const operation = operationOf(endpoint);

  if (fixture.part === 'body') {
    const ref = operation.requestBody?.content['application/json']?.schema.$ref ?? '';
    return [validateAgainst(ref, fixture.value)].filter((problem) => problem !== null);
  }
  if (fixture.part === 'response') {
    const ref =
      operation.responses[String(endpoint.success.status)]?.content?.['application/json']?.schema
        .$ref ?? '';
    return [validateAgainst(ref, fixture.value)].filter((problem) => problem !== null);
  }

  // Path and query parameters are documented one by one.
  const location = fixture.part === 'params' ? 'path' : 'query';
  return Object.entries(fixture.value as Record<string, unknown>).flatMap(([name, value]) => {
    const parameter = operation.parameters.find(
      (candidate) => candidate.name === name && candidate.in === location,
    );
    if (parameter === undefined) return [`${name} is not a documented ${location} parameter`];
    return ajv.validate(parameter.schema, value) ? [] : [`${name}: ${ajv.errorsText()}`];
  });
}

describe('the generated OpenAPI document', () => {
  it('the generated document is valid OpenAPI 3.1', async () => {
    const validator = new Validator();
    const copy = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
    const result = await validator.validate(copy);

    expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
    expect(result.valid).toBe(true);
    expect(validator.version).toBe('3.1');
  });

  it('every component schema compiles as JSON Schema 2020-12', () => {
    const names = Object.keys(document.components.schemas);

    expect(names.length).toBeGreaterThan(25);
    for (const name of names) {
      expect(
        () => ajv.compile({ $ref: `${documentUri}#/components/schemas/${name}` }),
        name,
      ).not.toThrow();
    }
  });

  it('every fixture validates against its schema in the generated document', () => {
    let checked = 0;

    for (const fixture of fixtures) {
      const endpoint = endpointList.find((candidate) => candidate.id === fixture.endpoint);
      if (endpoint === undefined) continue;

      expect(problemsOf(fixture, endpoint), fixture.name).toEqual([]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(25);
  });

  it('every problem fixture validates against the Problem schema', () => {
    const problems = fixtures.filter((fixture) => fixture.name.startsWith('problem/'));

    expect(problems).toHaveLength(14);
    for (const { name, value } of problems) {
      expect(validateAgainst('#/components/schemas/Problem', value), name).toBeNull();
    }
  });

  // The published schemas are not decoration: they refuse what the zod schemas refuse.
  it('the published schema refuses a completion with an unknown field or a fractional time', () => {
    const completion = fixtures.find((fixture) => fixture.name === 'sessions.complete/body');
    const value = completion?.value as { answers: Record<string, unknown>[] };
    const ref = '#/components/schemas/SessionsCompleteRequest';

    expect(validateAgainst(ref, value)).toBeNull();
    expect(validateAgainst(ref, { ...value, totalPoints: 9999 })).not.toBeNull();
    expect(
      validateAgainst(ref, { ...value, answers: [{ ...value.answers[0], elapsedMs: 12.5 }] }),
    ).not.toBeNull();
    expect(validateAgainst(ref, { ...value, utcOffsetMinutes: 900 })).not.toBeNull();
  });
});
