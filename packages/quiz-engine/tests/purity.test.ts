import { describe, expect, it, vi } from 'vitest';
import { gradingFixtures, runSharedFixtures, scoringFixtures } from '../src/fixtures/index.ts';
import {
  evaluateSession,
  gradeAnswer,
  mvpRegistry,
  scoreSession,
  specMvpTunables,
  specScoringConfig,
} from '../src/index.ts';
import type { GradeStatus, SessionEvaluation, SessionItem } from '../src/index.ts';

// Graders and scoring are pure: the same inputs give the same result on any device, at any time,
// in any order (QT-02, roadmap §4.3). Lint forbids the engine the clock, randomness and the
// locale; these tests show the engine doesn't reach them, and that it keeps nothing between calls.

/** A function the engine must not call: calling it throws. */
const refuse = (name: string) =>
  function refused(): never {
    throw new Error(`The engine reached for ${name}.`);
  };

/** A global the engine must not touch: reading a property of it, calling it or constructing it throws. */
const forbidden = (name: string): unknown => {
  const refused = refuse(name);
  return new Proxy(refused, { get: refused, apply: refused, construct: refused });
};

/** One item per registered type, taken from the shared fixture that expects `status`. */
const sessionOf = (status: GradeStatus): SessionItem[] =>
  mvpRegistry.types.map((type, index) => {
    const fixture = gradingFixtures.find(
      (candidate) =>
        candidate.question.type === type &&
        candidate.expected.status === status &&
        candidate.tunables === undefined,
    );
    if (fixture === undefined) throw new Error(`No fixture expects ${status} for ${type}.`);

    return {
      question: fixture.question,
      answer: fixture.answer,
      locale: fixture.locale,
      difficultyMultiplier: 1,
      // Each answer later than the one before, so every item scores differently.
      timing: { timed: true, elapsedMs: 4_000 * index, standardLimitMs: 20_000 },
    };
  });

const evaluate = (items: readonly SessionItem[]): SessionEvaluation =>
  evaluateSession(mvpRegistry, items, specMvpTunables, specScoringConfig);

describe('purity', () => {
  it('graders are pure: the shared fixtures pass with the clock, randomness and locale APIs booby-trapped', () => {
    vi.stubGlobal('Date', forbidden('Date'));
    vi.stubGlobal('Intl', forbidden('Intl'));
    vi.stubGlobal('performance', forbidden('performance'));
    vi.stubGlobal('crypto', forbidden('crypto'));
    vi.spyOn(Math, 'random').mockImplementation(refuse('Math.random'));
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(refuse('toLocaleLowerCase'));
    vi.spyOn(String.prototype, 'toLocaleUpperCase').mockImplementation(refuse('toLocaleUpperCase'));
    vi.spyOn(String.prototype, 'localeCompare').mockImplementation(refuse('localeCompare'));
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(refuse('toLocaleString'));

    let report;
    try {
      report = runSharedFixtures();
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }

    expect(report.ran).toBe(gradingFixtures.length + scoringFixtures.length);
    expect(report.failures).toEqual([]);
  });

  it('evaluating the same completion twice gives deep-equal results (duplicate and retry)', () => {
    const completion = sessionOf('correct');

    const first = evaluate(completion);
    const duplicate = evaluate(completion);
    // A retry arrives as new JSON: equal values in other objects.
    const retry = evaluate(JSON.parse(JSON.stringify(completion)) as SessionItem[]);

    expect(duplicate).toEqual(first);
    expect(retry).toEqual(first);
    // Five correct answers at 100 points: speed bonuses of 50 down to 10, combos of 0 up to 40.
    expect(first.grades.map((grade) => grade.status)).toEqual(
      mvpRegistry.types.map(() => 'correct'),
    );
    expect(first.score.totalPoints).toBe(750);
  });

  it('interleaving two sessions changes neither result (no shared state)', () => {
    const sessions = { a: sessionOf('correct'), b: sessionOf('incorrect') };
    const alone = { a: evaluate(sessions.a), b: evaluate(sessions.b) };

    // One answer of A, then one of B, and so on.
    const turns = sessions.a.flatMap((item, index) => [
      { session: 'a', item },
      ...sessions.b.slice(index, index + 1).map((other) => ({ session: 'b', item: other })),
    ]);
    const graded = turns.map(({ session, item }) => ({
      session,
      grade: gradeAnswer(mvpRegistry, item.question, item.answer, {
        locale: item.locale,
        tunables: specMvpTunables,
      }),
      difficultyMultiplier: item.difficultyMultiplier,
      timing: item.timing,
    }));
    const interleaved = (session: string): SessionEvaluation => {
      const own = graded.filter((turn) => turn.session === session);
      return {
        grades: own.map((turn) => turn.grade),
        score: scoreSession(own, specScoringConfig),
      };
    };

    expect(turns.map((turn) => turn.session).join('')).toBe('ababababab');
    expect(interleaved('a')).toEqual(alone.a);
    expect(interleaved('b')).toEqual(alone.b);
    expect(alone.a.score.totalPoints).toBe(750);
    expect(alone.b.score.totalPoints).toBe(0);
  });
});
