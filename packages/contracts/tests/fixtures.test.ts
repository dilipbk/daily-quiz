import { describe, expect, it } from 'vitest';
import { endpointList } from '../src/endpoints.ts';
import { errorCatalog, errorCodes } from '../src/errors.ts';
import { fixtures } from '../src/fixtures/index.ts';
import type { FixturePart } from '../src/fixtures/index.ts';

// The second half of ENG-04's done-when: every fixture parses with its schema. And because the
// fixtures are what the fake server answers with, every endpoint has one for each thing it takes
// and for what it answers.

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('fixtures', () => {
  it('every fixture parses with its schema and comes back unchanged', () => {
    expect(fixtures.length).toBeGreaterThan(40);

    for (const { name, schema, value } of fixtures) {
      const result = schema.safeParse(value);

      expect(result.success, `${name}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      // Unchanged: a fixture holds no field its schema would drop, and nothing is transformed.
      expect(result.data, name).toEqual(value);
    }
  });

  it('every fixture is plain JSON', () => {
    for (const { name, value } of fixtures) {
      expect(JSON.parse(JSON.stringify(value)), name).toStrictEqual(value);
    }
  });

  it('fixture names are unique', () => {
    const names = fixtures.map((fixture) => fixture.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('every endpoint has a fixture for each input it takes and for its response', () => {
    for (const endpoint of endpointList) {
      const needed: FixturePart[] = [
        ...(endpoint.params === null ? [] : (['params'] as const)),
        ...(endpoint.query === null ? [] : (['query'] as const)),
        ...(endpoint.body === null ? [] : (['body'] as const)),
        ...(endpoint.success.body === null ? [] : (['response'] as const)),
      ];
      const held = new Set(
        fixtures.filter((fixture) => fixture.endpoint === endpoint.id).map(({ part }) => part),
      );

      expect([...held].sort(), endpoint.id).toEqual([...needed].sort());
    }
  });

  it('an endpoint’s fixture is checked against that endpoint’s own schema', () => {
    for (const fixture of fixtures) {
      if (fixture.endpoint === undefined || fixture.part === undefined) continue;
      const endpoint = endpointList.find((candidate) => candidate.id === fixture.endpoint);
      const own = fixture.part === 'response' ? endpoint?.success.body : endpoint?.[fixture.part];

      expect(fixture.schema, fixture.name).toBe(own);
    }
  });

  it('every error code has a problem fixture with that code’s status', () => {
    for (const code of errorCodes) {
      const fixture = fixtures.find((candidate) => candidate.name === `problem/${code}`);

      expect(fixture?.value, code).toMatchObject({ code, status: errorCatalog[code].status });
    }
  });
});

// The reading rule of ADR 0023, shown on every fixture instead of on one example.
describe('requests are strict and responses are tolerant', () => {
  const sent = fixtures.filter(
    (fixture) => fixture.part !== undefined && fixture.part !== 'response',
  );
  const answered = fixtures.filter((fixture) => fixture.part === 'response');

  it('every request fixture is refused once it carries a field the contract does not name', () => {
    expect(sent.length).toBeGreaterThan(8);

    for (const { name, schema, value } of sent) {
      if (!isPlainObject(value)) throw new Error(`${name} is not an object.`);

      expect(schema.safeParse({ ...value, addedByMistake: true }).success, name).toBe(false);
    }
  });

  it('every response fixture still parses with a field from a newer server, which is dropped', () => {
    expect(answered.length).toBeGreaterThan(12);

    for (const { name, schema, value } of answered) {
      if (!isPlainObject(value)) throw new Error(`${name} is not an object.`);
      const result = schema.safeParse({ ...value, addedInALaterVersion: { anything: 1 } });

      expect(result.success, name).toBe(true);
      expect(result.data, name).toEqual(value);
    }
  });
});
