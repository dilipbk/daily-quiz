import { describe, expect, it } from 'vitest';
import { runScoringFixtures } from '../src/core/conformance.ts';
import { gradeSchema } from '../src/core/module.ts';
import { scoreInputSchema, scoringConfigSchema } from '../src/core/scoring.ts';
import { gradingFixtures, runSharedFixtures, scoringFixtures } from '../src/fixtures/index.ts';
import { mvpRegistry } from '../src/types/index.ts';

describe('shared fixtures', () => {
  it("every fixture question parses with the registry's question schema", () => {
    for (const fixture of gradingFixtures) {
      const result = mvpRegistry.questionSchema.safeParse(fixture.question);

      expect(result.error?.issues, fixture.id).toBeUndefined();
    }
  });

  it("fixture ids are unique and start with their question's type", () => {
    const ids = gradingFixtures.map((fixture) => fixture.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const fixture of gradingFixtures) {
      expect(fixture.id.startsWith(`${fixture.question.type}/`), fixture.id).toBe(true);
    }
  });

  it('every fixture cites a requirement and expects a sound grade under sound tunables', () => {
    for (const fixture of gradingFixtures) {
      expect(fixture.cites, fixture.id).not.toHaveLength(0);
      expect(gradeSchema.safeParse(fixture.expected).success, fixture.id).toBe(true);
      if (fixture.tunables !== undefined) {
        expect(mvpRegistry.tunablesSchema.safeParse(fixture.tunables).success, fixture.id).toBe(
          true,
        );
      }
    }
  });

  // Computed from the registry, so a type added without its fixtures fails here.
  it('every registered type has a fixture for correct, incorrect, unanswered and invalid', () => {
    for (const type of mvpRegistry.types) {
      const statuses = new Set(
        gradingFixtures
          .filter((fixture) => fixture.question.type === type)
          .map((fixture) => fixture.expected.status),
      );

      expect([...statuses].sort(), type).toEqual(['correct', 'incorrect', 'invalid', 'unanswered']);
    }
  });

  it('every scoring fixture has its own id, cites a requirement and holds values the schemas accept', () => {
    const ids = scoringFixtures.map((fixture) => fixture.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const fixture of scoringFixtures) {
      expect(fixture.id.startsWith('scoring/'), fixture.id).toBe(true);
      expect(fixture.cites, fixture.id).not.toHaveLength(0);
      expect(scoringConfigSchema.safeParse(fixture.config).success, fixture.id).toBe(true);
      expect(fixture.inputs, fixture.id).not.toHaveLength(0);
      for (const input of fixture.inputs) {
        expect(scoreInputSchema.safeParse(input).success, fixture.id).toBe(true);
      }
    }
  });

  it('§10.5: the shared fixture for the DS-01 example scores 112', () => {
    const example = scoringFixtures.filter((fixture) => fixture.id === 'scoring/ds-01-example');

    expect(example.map((fixture) => fixture.expected.answers)).toEqual([
      [{ base: 80, speedBonus: 32, combo: 0, total: 112, streak: 1 }],
    ]);
    expect(runScoringFixtures(example)).toEqual({ ran: 1, failures: [] });
  });

  it('D13: the shared fixtures at and beyond the Standard limit keep their base points and earn no speed bonus', () => {
    const late = scoringFixtures.filter((fixture) => fixture.cites.includes('D13'));

    expect(late.map((fixture) => fixture.id).sort()).toEqual([
      'scoring/at-the-limit',
      'scoring/d13-beyond-standard',
    ]);
    for (const fixture of late) {
      for (const answer of fixture.expected.answers) {
        expect(answer.speedBonus, fixture.id).toBe(0);
        expect(answer.total, fixture.id).toBe(answer.base);
        expect(answer.base, fixture.id).toBeGreaterThan(0);
      }
    }
    expect(runScoringFixtures(late)).toEqual({ ran: 2, failures: [] });
  });

  it('QT-02: every shared fixture passes', () => {
    expect(gradingFixtures.length).toBeGreaterThan(0);
    expect(scoringFixtures.length).toBeGreaterThan(0);
    expect(runSharedFixtures()).toEqual({
      ran: gradingFixtures.length + scoringFixtures.length,
      failures: [],
    });
  });
});
