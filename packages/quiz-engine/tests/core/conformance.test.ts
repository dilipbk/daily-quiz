import { describe, expect, it } from 'vitest';
import { runGradingFixtures, runScoringFixtures } from '../../src/core/conformance.ts';
import type { GradingFixture, ScoringFixture } from '../../src/core/conformance.ts';
import { deepEqual } from '../../src/core/equal.ts';
import { correct, incorrect, unanswered } from '../../src/core/module.ts';
import { scoreSession, specScoringConfig } from '../../src/core/scoring.ts';
import { toyRegistry } from '../support/toy-types.ts';

const tunables = { toy_word: { ignoreCase: true } };

const flagQuestion = { type: 'toy_flag', payload: {}, key: { value: true } };
const wordQuestion = {
  type: 'toy_word',
  payload: { hint: 'The capital of France' },
  key: { word: 'paris' },
};

const fixture = (id: string, rest: Omit<GradingFixture, 'id' | 'cites' | 'locale'>) => ({
  id,
  cites: ['QT-02'],
  locale: 'en',
  ...rest,
});

describe('runGradingFixtures', () => {
  it('reports each failing fixture by id with expected and actual', () => {
    const fixtures: GradingFixture[] = [
      fixture('toy_flag/correct', {
        question: flagQuestion,
        answer: { type: 'toy_flag', response: { value: true } },
        expected: correct(),
      }),
      fixture('toy_flag/unanswered', {
        question: flagQuestion,
        answer: null,
        expected: unanswered(),
      }),
      fixture('toy_flag/wrong-expectation', {
        question: flagQuestion,
        answer: { type: 'toy_flag', response: { value: false } },
        expected: correct(),
      }),
    ];

    expect(runGradingFixtures(toyRegistry, fixtures, tunables)).toEqual({
      ran: 3,
      failures: [{ id: 'toy_flag/wrong-expectation', expected: correct(), actual: incorrect() }],
    });
  });

  it("a fixture's own tunables replace the runner's", () => {
    const shouted = { type: 'toy_word', response: { word: 'PARIS' } };
    const fixtures: GradingFixture[] = [
      fixture('toy_word/case-ignored', {
        question: wordQuestion,
        answer: shouted,
        expected: correct(),
      }),
      fixture('toy_word/case-kept', {
        question: wordQuestion,
        answer: shouted,
        tunables: { toy_word: { ignoreCase: false } },
        expected: incorrect(),
      }),
    ];

    expect(runGradingFixtures(toyRegistry, fixtures, tunables)).toEqual({ ran: 2, failures: [] });
  });

  it('no fixtures, no failures', () => {
    expect(runGradingFixtures(toyRegistry, [], tunables)).toEqual({ ran: 0, failures: [] });
  });
});

describe('runScoringFixtures', () => {
  const oneCorrect = [
    {
      grade: correct(),
      difficultyMultiplier: 0.8,
      timing: { timed: true, elapsedMs: 4_000, standardLimitMs: 20_000 },
    },
  ] as const;

  it('reports each failing scoring fixture by id with expected and actual', () => {
    const expected = {
      answers: [{ base: 80, speedBonus: 32, combo: 0, total: 112, streak: 1 }],
      totalPoints: 112,
      correctCount: 1,
      questionCount: 1,
    };
    const fixtures: ScoringFixture[] = [
      {
        id: 'scoring/passes',
        cites: ['§10.5'],
        config: specScoringConfig,
        inputs: oneCorrect,
        expected,
      },
      {
        id: 'scoring/wrong-expectation',
        cites: ['§10.5'],
        config: specScoringConfig,
        inputs: oneCorrect,
        expected: { ...expected, totalPoints: 120 },
      },
    ];

    expect(runScoringFixtures(fixtures)).toEqual({
      ran: 2,
      failures: [
        {
          id: 'scoring/wrong-expectation',
          expected: { ...expected, totalPoints: 120 },
          actual: expected,
        },
      ],
    });
  });

  it("scores each fixture with the fixture's own config", () => {
    const doubled = { ...specScoringConfig, basePoints: 200 };

    expect(
      runScoringFixtures([
        {
          id: 'scoring/own-config',
          cites: ['§10.5'],
          config: doubled,
          inputs: oneCorrect,
          expected: scoreSession(oneCorrect, doubled),
        },
      ]),
    ).toEqual({ ran: 1, failures: [] });
    expect(scoreSession(oneCorrect, doubled).totalPoints).toBe(224);
  });
});

describe('deepEqual', () => {
  it('deepEqual compares plain JSON structurally', () => {
    // Key order doesn't matter; array order does.
    expect(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toBe(false);

    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual({ credit: 0 }, { credit: -0 })).toBe(true);

    // A missing key and an undefined value are the same thing; null is a value.
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(deepEqual({ a: 1, b: null }, { a: 1 })).toBe(false);

    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
  });

  it('deepEqual reads own keys only', () => {
    // JSON.parse makes "__proto__" an own key; every object also inherits a property of that name.
    expect(deepEqual(JSON.parse('{"__proto__": {}}'), {})).toBe(false);
    expect(deepEqual({}, JSON.parse('{"__proto__": {}}'))).toBe(false);
    expect(
      deepEqual(JSON.parse('{"__proto__": {"a": 1}}'), JSON.parse('{"__proto__": {"a": 1}}')),
    ).toBe(true);
  });
});
