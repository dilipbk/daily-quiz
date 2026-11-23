import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { gradeAnswer } from '../../src/core/grading.ts';
import { incorrect, invalid } from '../../src/core/module.ts';
import { text } from '../../src/fixtures/content.ts';
import { mvpRegistry, specMvpTunables } from '../../src/types/index.ts';
import { ordering } from '../../src/types/ordering.ts';
import { mvpKits } from '../support/arbitraries.ts';

/** Where the question schema objects, or nowhere when the question is sound. */
const issuePaths = (question: unknown): PropertyKey[][] => {
  const result = mvpRegistry.questionSchema.safeParse(question);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
};

const item = (id: string, label = id) => ({ id, content: text(label) });

const question = (items: unknown, order: unknown) => ({
  type: 'ordering',
  payload: { items },
  key: { order },
});

const planets = [item('mars'), item('mercury'), item('earth'), item('venus')];
const nearestFirst = ['mercury', 'venus', 'earth', 'mars'];

const context = { locale: 'en', tunables: specMvpTunables };

describe('ordering questions', () => {
  it('accepts 3 to 6 distinct items with a key that orders them all', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];

    expect(issuePaths(question(planets, nearestFirst))).toEqual([]);
    expect(issuePaths(question([item('a'), item('b'), item('c')], ['c', 'b', 'a']))).toEqual([]);
    expect(
      issuePaths(
        question(
          six.map((id) => item(id)),
          [...six].reverse(),
        ),
      ),
    ).toEqual([]);
  });

  it('refuses fewer than 3 or more than 6 items', () => {
    const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    expect(issuePaths(question([item('a'), item('b')], ['b', 'a']))).toContainEqual([
      'payload',
      'items',
    ]);
    expect(
      issuePaths(
        question(
          seven.map((id) => item(id)),
          [...seven].reverse(),
        ),
      ),
    ).toContainEqual(['payload', 'items']);
  });

  it('a list over its cap is refused for its size alone, before its items are compared', () => {
    const same = Array.from({ length: 2_000 }, () => item('mars'));
    const order = same.map((entry) => entry.id);

    expect(issuePaths(question(same, order))).toEqual([
      ['payload', 'items'],
      ['key', 'order'],
    ]);
  });

  it("refuses a key that isn't a permutation of the item ids", () => {
    const missing = ['mercury', 'venus', 'earth'];
    const repeated = ['mercury', 'mercury', 'earth', 'mars'];
    const unknown = ['mercury', 'venus', 'earth', 'pluto'];
    const extra = [...nearestFirst, 'pluto'];

    for (const order of [missing, repeated, unknown, extra]) {
      expect(issuePaths(question(planets, order)), order.join()).toEqual([['key', 'order']]);
    }
  });

  it('refuses items already stored in key order', () => {
    const stored = planets.map((planet) => planet.id);

    // The payload goes to the player before they answer: it would give the answer away.
    expect(issuePaths(question(planets, stored))).toEqual([['payload', 'items']]);
  });

  it('refuses duplicate item ids', () => {
    const items = [item('mars'), item('mercury'), item('mars', 'Earth')];

    expect(issuePaths(question(items, ['mercury', 'mars', 'mars']))).toEqual([
      ['payload', 'items', 2, 'id'],
    ]);
  });

  it('refuses two items with the same content', () => {
    const items = [item('mars'), item('mercury'), item('earth', 'mars')];

    expect(issuePaths(question(items, ['mercury', 'earth', 'mars']))).toEqual([
      ['payload', 'items', 2, 'content'],
    ]);
  });

  it('refuses an item with no content, and properties the schema does not name', () => {
    const [mars, mercury, earth] = planets;
    const order = ['mercury', 'earth', 'mars'];

    expect(issuePaths(question([mars, mercury, { id: 'earth', content: [] }], order))).toEqual([
      ['payload', 'items', 2, 'content'],
    ]);
    expect(issuePaths(question([mars, mercury, { ...earth, position: 3 }], order))).toEqual([
      ['payload', 'items', 2],
    ]);
    expect(
      issuePaths({ ...question([mars, mercury, earth], order), key: { order, ties: [] } }),
    ).toEqual([['key']]);
  });

  it('a response with more ids than a question can hold is malformed', () => {
    const order = Array.from({ length: 300 }, () => 'mercury');
    const answer = { type: 'ordering', response: { order } };

    expect(ordering.responseSchema.safeParse({ order }).success).toBe(false);
    expect(gradeAnswer(mvpRegistry, question(planets, nearestFirst), answer, context)).toEqual(
      invalid('malformed'),
    );
  });
});

describe('ordering properties', () => {
  const kit = mvpKits.find((candidate) => candidate.type === 'ordering');
  if (kit === undefined) throw new Error('mvpKits has no kit for ordering.');

  const sameOrder = (a: readonly unknown[], b: readonly unknown[]): boolean =>
    a.length === b.length && a.every((value, index) => value === b[index]);
  const shuffled = <T>(values: T[]) => fc.shuffledSubarray(values, { minLength: values.length });
  const answering = (order: readonly string[]) => ({ type: 'ordering', response: { order } });

  it("ordering: any permutation other than the key's is incorrect with credit 0", () => {
    const cases = kit.question.chain((drawn) => {
      const { order } = ordering.keySchema.parse(drawn.key);
      return fc.record({
        drawn: fc.constant(drawn),
        other: shuffled(order).filter((candidate) => !sameOrder(candidate, order)),
      });
    });

    fc.assert(
      fc.property(cases, ({ drawn, other }) => {
        expect(gradeAnswer(mvpRegistry, drawn, answering(other), context)).toEqual(incorrect());
      }),
    );
  });

  it('ordering: the stored order of items never changes a grade', () => {
    const cases = kit.question.chain((drawn) => {
      const { items } = ordering.payloadSchema.parse(drawn.payload);
      const { order } = ordering.keySchema.parse(drawn.key);
      const ids = items.map((entry) => entry.id);
      const stillSound = (stored: typeof items): boolean =>
        !sameOrder(
          stored.map((entry) => entry.id),
          order,
        );

      return fc.record({
        drawn: fc.constant(drawn),
        restored: shuffled(items).filter(stillSound),
        answer: fc.oneof(
          shuffled(ids).map(answering),
          fc.array(fc.constantFrom(...ids, 'pluto'), { maxLength: 8 }).map(answering),
        ),
      });
    });

    fc.assert(
      fc.property(cases, ({ drawn, restored, answer }) => {
        const reordered = { ...drawn, payload: { items: restored } };

        expect(mvpRegistry.questionSchema.safeParse(reordered).success).toBe(true);
        expect(gradeAnswer(mvpRegistry, reordered, answer, context)).toEqual(
          gradeAnswer(mvpRegistry, drawn, answer, context),
        );
      }),
    );
  });
});
