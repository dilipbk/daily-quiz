// Settings come from the environment (roadmap §2 rule 6). A value the process can't use stops it
// at once, with a message that names the variable and never prints the value (SEC-01).

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;

/** The port to listen on: `PORT`, or 3000 when it is unset. */
export function readPort(env: NodeJS.ProcessEnv): number {
  const value = env.PORT;
  if (value === undefined) return DEFAULT_PORT;
  if (/^[1-9]\d{0,4}$/.test(value) && Number(value) <= MAX_PORT) return Number(value);
  throw new ConfigError(`PORT must be a whole number from 1 to ${String(MAX_PORT)}.`);
}

/** The commit the image was built from (`GIT_COMMIT`), or `unknown` when the build passed none. */
export function readCommit(env: NodeJS.ProcessEnv): string {
  const value = env.GIT_COMMIT;
  if (value === undefined || value === '') return 'unknown';
  if (/^[0-9a-f]{7,40}$/.test(value)) return value;
  throw new ConfigError('GIT_COMMIT must be 7 to 40 lowercase hexadecimal characters, or unset.');
}

/**
 * The migration role's connection string. It has a variable of its own so that the migration
 * role and the application's role stay apart (roadmap §7, ADR 0080); it never falls back to
 * `DATABASE_URL`. TLS is chosen by the URL's `sslmode`.
 */
export function readMigrationUrl(env: NodeJS.ProcessEnv): string {
  const value = env.MIGRATION_DATABASE_URL;
  if (value === undefined || value === '') {
    throw new ConfigError('MIGRATION_DATABASE_URL is not set. migrate never uses DATABASE_URL.');
  }
  const url = URL.parse(value);
  if (url === null || !['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname === '') {
    throw new ConfigError(
      'MIGRATION_DATABASE_URL must be a postgres:// or postgresql:// URL with a host.',
    );
  }
  return value;
}
