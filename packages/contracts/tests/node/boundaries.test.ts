import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The tests in this folder read files or load Node-only libraries, so they alone are compiled
// with Node's types (see ./tsconfig.json). This one guards what the type checker can't see: the
// package runs on Hermes and on Node, so `src` may reach neither platform (roadmap §3.1).

interface Manifest {
  dependencies?: Record<string, string>;
}

const packagesDir = join(import.meta.dirname, '..', '..', '..');
const srcDir = join(packagesDir, 'contracts', 'src');

const readManifest = (folder: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, folder, 'package.json'), 'utf8')) as Manifest;

const sources = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts'))
  .map((file) => ({
    path: file.split(/[\\/]/).join('/'),
    source: readFileSync(join(srcDir, file), 'utf8'),
  }));

/** Every module a file imports or re-exports from. */
const specifiersOf = (source: string): string[] =>
  [...source.matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );

/** The file without its comments, which may name what the code must not use. */
const codeOf = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('package boundaries', () => {
  it("the package depends on zod and the two shared packages only, at the engine's zod range", () => {
    const contracts = readManifest('contracts').dependencies ?? {};
    const engine = readManifest('quiz-engine').dependencies ?? {};

    expect(Object.keys(contracts).sort()).toEqual([
      '@repo/content-blocks',
      '@repo/quiz-engine',
      'zod',
    ]);
    expect(contracts.zod).toBeDefined();
    expect(contracts.zod).toBe(engine.zod);
  });

  it('src imports only zod and the two workspace packages', () => {
    expect(sources.map((file) => file.path)).toContain('primitives.ts');

    for (const { path, source } of sources) {
      const outside = specifiersOf(source).filter(
        (specifier) =>
          !specifier.startsWith('.') &&
          !['zod', '@repo/content-blocks', '@repo/quiz-engine'].includes(specifier),
      );
      expect(outside, path).toEqual([]);
    }
  });

  it('every relative import ends in .ts', () => {
    for (const { path, source } of sources) {
      const bare = specifiersOf(source).filter(
        (specifier) => specifier.startsWith('.') && !specifier.endsWith('.ts'),
      );
      expect(bare, path).toEqual([]);
    }
  });

  it('src reads no clock, locale, randomness or platform', () => {
    const forbidden =
      /\b(?:Date|Intl|performance|crypto|process|globalThis|fetch|setTimeout|setInterval|require)\b|Math\.random|toLocale|localeCompare/;

    for (const { path, source } of sources) {
      expect(forbidden.exec(codeOf(source))?.[0], path).toBeUndefined();
    }
  });
});
