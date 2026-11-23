import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The API and the app run these rules from the same source (roadmap §7), so the source may
// import nothing but itself, may read no clock, and may use only what Hermes documents
// (ADR 0005). The package's tsconfig backs this up: `types: []` keeps Node's globals out.

const srcDir = join(import.meta.dirname, '..', 'src');
const sources = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts'))
  .map((file) => ({ file, text: readFileSync(join(srcDir, file), 'utf8') }));

const importSpecifier =
  /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]/g;

const banned = [
  'Date.now',
  'new Date()',
  'performance.now',
  'Math.random',
  'Temporal',
  'formatToParts',
  'supportedValuesOf',
  'process.',
  'fetch(',
];

describe('the package is pure TypeScript', () => {
  it('finds the source files to check', () => {
    expect(sources.map(({ file }) => file)).toContain('streak.ts');
    expect(sources.length).toBeGreaterThanOrEqual(7);
  });

  it.each(sources)('$file imports only its sibling source files', ({ text }) => {
    const specifiers = [...text.matchAll(importSpecifier)].map(
      (match) => match[1] ?? match[2] ?? match[3],
    );
    for (const specifier of specifiers) {
      expect(specifier).toMatch(/^\.\/[\w-]+\.ts$/);
    }
  });

  it.each(sources)('$file reads no clock and uses nothing Hermes leaves out', ({ text }) => {
    for (const phrase of banned) {
      expect(text).not.toContain(phrase);
    }
  });
});
