import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the repository layout of roadmap §4.2 and spec §18.3: every folder under
// packages/ is a private, source-only TypeScript package, and packages never depend on apps.

interface Manifest {
  name?: string;
  private?: boolean;
  type?: string;
  exports?: Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const packagesDir = join(import.meta.dirname, '..', '..');

const folders = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const packageNames = folders.map((folder) => `@repo/${folder}`);

const readManifest = (folder: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, folder, 'package.json'), 'utf8')) as Manifest;

describe.each(folders)('packages/%s', (folder) => {
  const manifest = readManifest(folder);

  it('is a private ES module named after its folder', () => {
    expect(manifest).toMatchObject({ name: `@repo/${folder}`, private: true, type: 'module' });
  });

  it('is source-only: it exports files it ships and has no build step', () => {
    const targets = Object.values(manifest.exports ?? {});

    expect(targets).not.toHaveLength(0);
    for (const target of targets) {
      expect(target).not.toMatch(/^\.\/dist\//);
      expect(existsSync(join(packagesDir, folder, target)), `${target} exists`).toBe(true);
    }
    expect(manifest.scripts).not.toHaveProperty('build');
  });

  it('has a typecheck script, so `pnpm verify` covers it', () => {
    expect(manifest.scripts).toHaveProperty('typecheck');
  });

  it('depends on workspace packages only, never on an app', () => {
    const workspaceDependencies = Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    })
      .filter(([, range]) => range.startsWith('workspace:'))
      .map(([name]) => name);

    for (const name of workspaceDependencies) {
      expect(packageNames).toContain(name);
    }
  });
});
