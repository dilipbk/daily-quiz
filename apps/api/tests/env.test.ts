import { describe, expect, it } from 'vitest';
import { ConfigError, readCommit, readMigrationUrl, readPort } from '../src/env.ts';

// A setting the process can't use stops it at once, names the variable and never prints the
// value, which may be a connection string (SEC-01, roadmap §7).
function refusalOf(read: () => unknown): string {
  try {
    read();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as ConfigError).message;
  }
  throw new Error('expected a ConfigError');
}

describe('PORT', () => {
  it('defaults to 3000 when unset', () => {
    expect(readPort({})).toBe(3000);
  });

  it('accepts a whole number from 1 to 65535', () => {
    expect(readPort({ PORT: '8080' })).toBe(8080);
    expect(readPort({ PORT: '1' })).toBe(1);
    expect(readPort({ PORT: '65535' })).toBe(65_535);
  });

  it.each(['', '0', '65536', '80.5', 'abc', ' 80', '1e3', '0x50', '08080'])(
    'refuses %j and names the variable, not the value',
    (value) => {
      const message = refusalOf(() => readPort({ PORT: value }));

      expect(message).toContain('PORT');
      if (value.trim() !== '') expect(message).not.toContain(value.trim());
    },
  );
});

describe('GIT_COMMIT', () => {
  it('is "unknown" when unset or empty', () => {
    expect(readCommit({})).toBe('unknown');
    expect(readCommit({ GIT_COMMIT: '' })).toBe('unknown');
  });

  it('accepts 7 to 40 lowercase hexadecimal characters', () => {
    expect(readCommit({ GIT_COMMIT: 'abc1234' })).toBe('abc1234');
    expect(readCommit({ GIT_COMMIT: 'a'.repeat(40) })).toBe('a'.repeat(40));
  });

  it.each(['ABC1234', 'abc123', 'a'.repeat(41), 'unknown', 'main', 'abc1234\n'])(
    'refuses %j and names the variable',
    (value) => {
      expect(refusalOf(() => readCommit({ GIT_COMMIT: value }))).toContain('GIT_COMMIT');
    },
  );
});

describe('MIGRATION_DATABASE_URL', () => {
  it('is required and never borrowed from DATABASE_URL', () => {
    const message = refusalOf(() =>
      readMigrationUrl({ DATABASE_URL: 'postgresql://app:do-not-print@db.example/app' }),
    );

    expect(message).toContain('MIGRATION_DATABASE_URL');
    expect(message).not.toContain('do-not-print');
    expect(refusalOf(() => readMigrationUrl({ MIGRATION_DATABASE_URL: '' }))).toContain(
      'MIGRATION_DATABASE_URL',
    );
  });

  it('returns a postgres URL unchanged', () => {
    for (const url of [
      'postgresql://migrator:do-not-print@db.example:5432/app?sslmode=verify-full',
      'postgres://migrator:do-not-print@postgres/app?sslmode=disable',
    ]) {
      expect(readMigrationUrl({ MIGRATION_DATABASE_URL: url })).toBe(url);
    }
  });

  it.each([
    'mysql://migrator:do-not-print@db.example/app',
    'do-not-print',
    'postgresql://migrator:do-not-print@/app',
  ])('refuses %j without printing it', (value) => {
    const message = refusalOf(() => readMigrationUrl({ MIGRATION_DATABASE_URL: value }));

    expect(message).toContain('MIGRATION_DATABASE_URL');
    expect(message).not.toContain('do-not-print');
  });
});
