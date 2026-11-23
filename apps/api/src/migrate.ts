import { runner } from 'node-pg-migrate';
import { Client } from 'pg';
import { ConfigError, readMigrationUrl } from './env.ts';

/** node-pg-migrate's history table, in the `public` schema (ADR 0080). */
export const MIGRATIONS_TABLE = 'pgmigrations';

export interface MigrateOptions {
  readonly env: NodeJS.ProcessEnv;
  /** The folder of migrations to apply: `apps/api/migrations` in the image. */
  readonly dir: string;
  readonly log: (line: string) => void;
}

/**
 * Applies every pending migration in `dir` and returns the process's exit code: 0 when the
 * database is up to date, 1 otherwise. It reads only `MIGRATION_DATABASE_URL`, and nothing it
 * prints contains the connection string.
 */
export async function runMigrate({ env, dir, log }: MigrateOptions): Promise<number> {
  let connectionString: string;
  try {
    connectionString = readMigrationUrl(env);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    log(error.message);
    return 1;
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    application_name: 'daily-quiz-migrate',
  });
  try {
    await client.connect();
    const applied = await runner({
      dbClient: client,
      dir,
      direction: 'up',
      migrationsTable: MIGRATIONS_TABLE,
      // Each set explicitly: node-pg-migrate's docs and source disagree on some defaults.
      // A run's migrations commit together, except that one calling `pgm.noTransaction()`
      // (CREATE INDEX CONCURRENTLY) commits those before it and runs on its own.
      singleTransaction: true,
      checkOrder: true,
      // A second run while one holds the lock fails at once and changes nothing.
      advisoryLockMode: 'fail',
      log,
    });
    log(`migrate done: ${String(applied.length)} applied`);
    return 0;
  } catch (error) {
    log(`migrate failed: ${redacted(describe(error), connectionString)}`);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as { code?: unknown }).code;
  return error.message || (typeof code === 'string' ? code : error.name);
}

/** Belt and braces: no message the driver or the tool writes may carry the password. */
function redacted(message: string, connectionString: string): string {
  const password = URL.parse(connectionString)?.password ?? '';
  if (password === '') return message;
  let decoded = password;
  try {
    decoded = decodeURIComponent(password);
  } catch {
    // A malformed escape: the raw form is the only one that could appear.
  }
  return message.replaceAll(password, '***').replaceAll(decoded, '***');
}
