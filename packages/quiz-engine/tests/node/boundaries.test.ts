import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mvpRegistry } from '../../src/index.ts';

// The only tests in this package that read files, so the only ones compiled with Node's types
// (see ./tsconfig.json). They guard what the type checker can't see: what the engine may reach.

interface Manifest {
  dependencies?: Record<string, string>;
}

interface SourceFile {
  /** Relative to src, with forward slashes. */
  readonly path: string;
  readonly source: string;
}

const packagesDir = join(import.meta.dirname, '..', '..', '..');
const srcDir = join(packagesDir, 'quiz-engine', 'src');

const readManifest = (folder: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, folder, 'package.json'), 'utf8')) as Manifest;

const readSource = (...path: string[]): string => readFileSync(join(srcDir, ...path), 'utf8');

/** Every TypeScript file under src, or under one folder of it. */
const sourcesUnder = (...folder: string[]): SourceFile[] =>
  readdirSync(join(srcDir, ...folder), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => {
      const path = [...folder, ...file.split(/[\\/]/)].join('/');
      return { path, source: readSource(path) };
    });

/** Every module a file imports or re-exports from: static, side-effect and dynamic imports. */
const specifiersOf = (source: string): string[] =>
  [...source.matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );

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

  // The second done-when clause, read from the files: a sixth type would touch no engine code.
  it('src/core names no question type and imports nothing from types, text or fixtures', () => {
    const core = sourcesUnder('core');
    expect(core.map((file) => file.path)).toContain('core/grading.ts');

    for (const { path, source } of core) {
      // Anywhere in the file, comments included: the core has no reason to spell a type's id.
      const named = mvpRegistry.types.filter((type) => source.includes(type));
      expect(named, path).toEqual([]);

      const outside = specifiersOf(source).filter((specifier) =>
        /\/(?:types|text|fixtures)\/|@repo\/content-blocks/.test(specifier),
      );
      expect(outside, path).toEqual([]);
    }
  });

  it('src uses only syntax every target engine runs', () => {
    const all = sourcesUnder();
    expect(all.map((file) => file.path)).toContain('text/normalize.ts');

    // Unicode property escapes, lookbehind and named groups, and the Intl namespace.
    for (const { path, source } of all) {
      const found = ['\\p{', '\\P{', '(?<', 'Intl.'].filter((syntax) => source.includes(syntax));
      expect(found, path).toEqual([]);
    }
  });

  it('only src/types/content.ts and src/fixtures/content.ts import @repo/content-blocks', () => {
    const importers = sourcesUnder()
      .filter((file) =>
        specifiersOf(file.source).some((specifier) => specifier.startsWith('@repo/content-blocks')),
      )
      .map((file) => file.path);

    expect(importers.sort()).toEqual(['fixtures/content.ts', 'types/content.ts']);
  });

  // Why the app's Jest and a device can run the fixtures: nothing under src, the fixtures' entry
  // point included, imports Vitest, fast-check, Node or anything else outside the two dependencies.
  it('the fixtures entry point imports no test runner: src imports only zod and @repo/content-blocks', () => {
    const packages = sourcesUnder().flatMap((file) =>
      specifiersOf(file.source).filter((specifier) => !specifier.startsWith('.')),
    );

    expect([...new Set(packages)].sort()).toEqual(['@repo/content-blocks', 'zod']);
    expect(specifiersOf(readSource('fixtures', 'index.ts')).length).toBeGreaterThan(0);
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
