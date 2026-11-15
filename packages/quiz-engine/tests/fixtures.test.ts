import { describe, expect, it } from 'vitest';
import { runGradingFixtures } from '../src/core/conformance.ts';
import { gradeSchema } from '../src/core/module.ts';
import { gradingFixtures } from '../src/fixtures/index.ts';
import { mvpRegistry, specMvpTunables } from '../src/types/index.ts';

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

  it('QT-02: every shared fixture passes', () => {
    expect(gradingFixtures.length).toBeGreaterThan(0);
    expect(runGradingFixtures(mvpRegistry, gradingFixtures, specMvpTunables)).toEqual({
      ran: gradingFixtures.length,
      failures: [],
    });
  });
});
