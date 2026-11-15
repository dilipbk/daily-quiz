import { deepEqual } from './equal.ts';
import { gradeAnswer } from './grading.ts';
import type { Grade } from './module.ts';
import type { AnyQuestionTypeModule, Registry, TunablesOf } from './registry.ts';
import { scoreSession } from './scoring.ts';
import type { ScoreInput, ScoringConfig, SessionScore } from './scoring.ts';

// Shared fixtures are data, and this is what runs them (spec QT-02). It imports no test framework,
// so the same fixtures run under Vitest here, under Jest in the app, and on a device.

export interface GradingFixture {
  /** '<type>/<case>' */
  readonly id: string;
  /** The requirement ids the case demonstrates. */
  readonly cites: readonly string[];
  readonly question: { readonly type: string; readonly payload: unknown; readonly key: unknown };
  readonly locale: string;
  readonly answer: unknown;
  /** Replaces the tunables passed to the runner, for this fixture. */
  readonly tunables?: unknown;
  readonly expected: Grade;
}

export interface ScoringFixture {
  readonly id: string;
  readonly cites: readonly string[];
  readonly config: ScoringConfig;
  /** A session's answers, in order. */
  readonly inputs: readonly ScoreInput[];
  readonly expected: SessionScore;
}

export interface FixtureReport {
  readonly ran: number;
  readonly failures: readonly {
    readonly id: string;
    readonly expected: unknown;
    readonly actual: unknown;
  }[];
}

export function runGradingFixtures<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  fixtures: readonly GradingFixture[],
  tunables: TunablesOf<M>,
): FixtureReport {
  const failures = fixtures.flatMap((fixture) => {
    const actual = gradeAnswer(registry, fixture.question, fixture.answer, {
      locale: fixture.locale,
      tunables: fixture.tunables === undefined ? tunables : (fixture.tunables as TunablesOf<M>),
    });
    return deepEqual(actual, fixture.expected)
      ? []
      : [{ id: fixture.id, expected: fixture.expected, actual }];
  });

  return { ran: fixtures.length, failures };
}

export function runScoringFixtures(fixtures: readonly ScoringFixture[]): FixtureReport {
  const failures = fixtures.flatMap((fixture) => {
    const actual = scoreSession(fixture.inputs, fixture.config);
    return deepEqual(actual, fixture.expected)
      ? []
      : [{ id: fixture.id, expected: fixture.expected, actual }];
  });

  return { ran: fixtures.length, failures };
}
