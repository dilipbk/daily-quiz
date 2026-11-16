import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The only tests in this package that read files, so the only ones compiled with Node's types
// (see ./tsconfig.json). They guard what the type checker can't see: what the engine may reach.

interface Manifest {
  dependencies?: Record<string, string>;
}

const packagesDir = join(import.meta.dirname, '..', '..', '..');
const srcDir = join(packagesDir, 'quiz-engine', 'src');

const readManifest = (folder: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, folder, 'package.json'), 'utf8')) as Manifest;

const readSource = (...path: string[]): string => readFileSync(join(srcDir, ...path), 'utf8');

/** The names in every `export type { … }` list of a file, sorted. */
const exportedTypes = (source: string): string[] =>
  [...source.matchAll(/export type \{([^}]*)\}/g)]
    .flatMap((list) => (list[1] ?? '').split(','))
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .sort();

describe('package boundaries', () => {
  it("the package depends on zod and @repo/content-blocks only, at content-blocks' zod range", () => {
    const engine = readManifest('quiz-engine').dependencies ?? {};
    const contentBlocks = readManifest('content-blocks').dependencies ?? {};

    expect(Object.keys(engine).sort()).toEqual(['@repo/content-blocks', 'zod']);
    expect(engine.zod).toBeDefined();
    expect(engine.zod).toBe(contentBlocks.zod);
  });

  // Types can't be listed at run time, so this reads the entry points. With the run-time names in
  // tests/public-api.test.ts, it is the whole surface that other packages build on.
  it('the package exports the types the plan lists, and ErasedQuestionTypeModule stays internal', () => {
    const entry = readSource('index.ts');
    const fixturesEntry = readSource('fixtures', 'index.ts');

    // Re-exports by name only: `export *` would publish whatever a file happens to export.
    const exportLines = entry.split('\n').filter((line) => line.startsWith('export'));
    expect(exportLines).not.toHaveLength(0);
    expect(exportLines.filter((line) => !/^export (type )?\{/.test(line))).toEqual([]);
    expect(fixturesEntry).not.toMatch(/export\s*\*/);

    expect(exportedTypes(entry)).toEqual(
      [
        // core/module.ts
        'Grade',
        'GradeStatus',
        'InvalidReason',
        'QuestionIssue',
        'QuestionTypeModule',
        'TimeClass',
        // core/registry.ts
        'AnswerOf',
        'AnyQuestionTypeModule',
        'PlayerQuestionOf',
        'QuestionOf',
        'Registry',
        'TunablesOf',
        // core/grading.ts
        'GradeContext',
        // core/scoring.ts
        'AnswerScore',
        'ScoreInput',
        'ScoreTiming',
        'ScoringConfig',
        'SessionScore',
        // core/timing.ts and core/session.ts
        'SessionEvaluation',
        'SessionItem',
        'TimingConfig',
        // core/conformance.ts
        'FixtureReport',
        'GradingFixture',
        'ScoringFixture',
        // text/normalize.ts and types/type-answer.ts
        'ArticlesByLanguage',
        'TypeAnswerTunables',
        // types/index.ts
        'Answer',
        'MvpTunables',
        'PlayerQuestion',
        'Question',
        'QuestionType',
      ].sort(),
    );
    expect(exportedTypes(fixturesEntry)).toEqual([]);

    // No public signature needs the erased module: `Registry.get` returns the modules as given.
    expect(entry).not.toContain('ErasedQuestionTypeModule');
  });
});
