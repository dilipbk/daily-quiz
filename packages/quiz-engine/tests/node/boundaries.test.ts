import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The only tests in this package that read files, so the only ones compiled with Node's types
// (see ./tsconfig.json). They guard what the type checker can't see: what the engine may reach.

interface Manifest {
  dependencies?: Record<string, string>;
}

const packagesDir = join(import.meta.dirname, '..', '..', '..');

const readManifest = (folder: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, folder, 'package.json'), 'utf8')) as Manifest;

describe('package boundaries', () => {
  it("the package depends on zod and @repo/content-blocks only, at content-blocks' zod range", () => {
    const engine = readManifest('quiz-engine').dependencies ?? {};
    const contentBlocks = readManifest('content-blocks').dependencies ?? {};

    expect(Object.keys(engine).sort()).toEqual(['@repo/content-blocks', 'zod']);
    expect(engine.zod).toBeDefined();
    expect(engine.zod).toBe(contentBlocks.zod);
  });
});
