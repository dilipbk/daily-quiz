import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runMigrate } from '../src/migrate.ts';

// These need no database. The smoke script proves the rest against real Postgres (ADR 0080).
const migrations = fileURLToPath(new URL('../migrations', import.meta.url));

async function migrate(env: NodeJS.ProcessEnv): Promise<{ code: number; output: string }> {
  const lines: string[] = [];
  const code = await runMigrate({ env, dir: migrations, log: (line) => lines.push(line) });
  return { code, output: lines.join('\n') };
}

describe('runMigrate', () => {
  it('refuses to start without MIGRATION_DATABASE_URL, even when DATABASE_URL is set', async () => {
    const { code, output } = await migrate({
      DATABASE_URL: 'postgresql://app:do-not-print@127.0.0.1:1/app?sslmode=disable',
    });

    expect(code).toBe(1);
    expect(output).toContain('MIGRATION_DATABASE_URL');
    expect(output).not.toContain('do-not-print');
  });

  it('exits 1 when the database is unreachable and never prints the connection string', async () => {
    const { code, output } = await migrate({
      MIGRATION_DATABASE_URL: 'postgresql://smoke:do-not-print@127.0.0.1:1/none?sslmode=disable',
    });

    expect(code).toBe(1);
    expect(output).toMatch(/^migrate failed: .+/m);
    expect(output).not.toContain('do-not-print');
  });
});
