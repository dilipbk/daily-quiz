// The API image's smoke test (FND-07a). The laptop and CI run this same script:
//   pnpm --filter @repo/api smoke
// It builds the image, checks its Node and time-zone data, starts Postgres, runs the migration
// step in its failure and success cases, starts the API, probes /health, stops it with SIGTERM
// and tears everything down. It stops at the first failure. Docker is needed; nothing else is.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeMismatches, timeZoneFailures, type RuntimeReport } from './checks.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const here = fileURLToPath(new URL('.', import.meta.url));
const image = 'daily-quiz-api:smoke';
const project = `daily-quiz-smoke-${String(process.pid)}`;
const composeFile = join(root, 'apps/api/compose.yaml');
const apiUid = '10001';
const mountedMigrations = '/app/apps/api/migrations';
const urlOf = (database: string): string =>
  `postgresql://postgres:postgres@postgres:5432/${database}?sslmode=disable`;
// Never a real password: the unreachable case checks that the step never prints it.
const unreachableUrl = 'postgresql://smoke:do-not-print@127.0.0.1:1/none?sslmode=disable';

interface Result {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

class SmokeFailure extends Error {
  readonly result: Result | undefined;

  constructor(message: string, result?: Result) {
    super(message);
    this.result = result;
  }
}

let composeEnv: NodeJS.ProcessEnv = process.env;

// Every command is a program and an argument array, never a shell string.
function run(command: string, args: readonly string[]): Result {
  const result = spawnSync(command, args, {
    cwd: root,
    env: composeEnv,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

/** Like `run`, with the command's output shown as it happens (the image build). */
function runShown(command: string, args: readonly string[]): Result {
  const result = spawnSync(command, args, { cwd: root, env: composeEnv, stdio: 'inherit' });
  if (result.error) throw result.error;
  return { code: result.status ?? 1, stdout: '', stderr: '' };
}

function runAsync(command: string, args: readonly string[]): Promise<Result> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: composeEnv });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function ok(result: Result, what: string): string {
  if (result.code !== 0) throw new SmokeFailure(`${what} exited ${String(result.code)}`, result);
  return result.stdout.trim();
}

function check(condition: boolean, message: string, result?: Result): void {
  if (!condition) throw new SmokeFailure(message, result);
}

const compose = (...args: string[]): string[] => [
  'compose',
  '-f',
  composeFile,
  '-p',
  project,
  ...args,
];

/** `migrate` in its own container on the compose network, against `database`. */
function migrateArgs(database: string, fixture?: string): string[] {
  const mount =
    fixture === undefined
      ? []
      : ['-v', `${join(here, 'fixtures', fixture)}:${mountedMigrations}:ro`];
  return compose(
    'run',
    '--rm',
    '--no-deps',
    '-e',
    `MIGRATION_DATABASE_URL=${urlOf(database)}`,
    ...mount,
    'migrate',
  );
}

function sql(database: string, query: string): string {
  return ok(
    run(
      'docker',
      compose(
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'postgres',
        '-d',
        database,
        '-v',
        'ON_ERROR_STOP=1',
        '-tAc',
        query,
      ),
    ),
    `psql on ${database}`,
  );
}

const detail = (line: string): void => {
  console.log(`    ${line}`);
};
const seconds = (since: number): string => `${((performance.now() - since) / 1000).toFixed(1)} s`;
const summary: string[] = [];

async function step(name: string, body: () => void | Promise<void>): Promise<void> {
  console.log(`▶ ${name}`);
  const started = performance.now();
  await body();
  console.log(`✓ ${name} (${seconds(started)})`);
}

async function smoke(): Promise<void> {
  const pinned = (
    JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      devEngines: { runtime: { version: string } };
    }
  ).devEngines.runtime.version;
  const commit = ok(run('git', ['rev-parse', 'HEAD']), 'git rev-parse');
  composeEnv = { ...process.env, API_IMAGE: image, API_HOST_PORT: '0', GIT_COMMIT: commit };
  let workspace: RuntimeReport | undefined;

  await step('preflight', () => {
    detail(
      `docker ${ok(run('docker', ['version', '--format', '{{.Server.Version}} {{.Server.Arch}}']), 'docker version')}`,
    );
    detail(
      `compose ${ok(run('docker', ['compose', 'version', '--short']), 'docker compose version')}`,
    );
    workspace = JSON.parse(
      ok(run(process.execPath, [join(here, 'tz-check.ts')]), 'tz-check on the workspace Node'),
    ) as RuntimeReport;
    detail(`workspace ${JSON.stringify(workspace)}`);
    detail(`package.json pins Node ${pinned}; commit ${commit}`);
  });

  await step('build the image (one command, from the repository root)', () => {
    const started = performance.now();
    ok(
      runShown('docker', [
        'build',
        '--progress=plain',
        '-f',
        'apps/api/Dockerfile',
        '--build-arg',
        `GIT_COMMIT=${commit}`,
        '-t',
        image,
        '.',
      ]),
      'docker build',
    );
    const bytes = Number(
      ok(
        run('docker', ['image', 'inspect', '--format', '{{.Size}}', image]),
        'docker image inspect',
      ),
    );
    summary.push(`build ${seconds(started)}`, `image ${(bytes / 1e6).toFixed(0)} MB`);
  });

  await step(
    'Node, ICU and time-zone data inside the image equal the workspace pin (ADR 0001, 0005)',
    () => {
      const result = run('docker', [
        'run',
        '--rm',
        '--entrypoint',
        'node',
        '-v',
        `${join(here, 'tz-check.ts')}:/app/apps/api/smoke/tz-check.ts:ro`,
        image,
        'apps/api/smoke/tz-check.ts',
      ]);
      const inImage = JSON.parse(ok(result, 'tz-check inside the image')) as RuntimeReport;
      detail(`image     ${JSON.stringify(inImage)}`);
      if (workspace === undefined) throw new SmokeFailure('no workspace report');
      const problems = [
        ...runtimeMismatches(pinned, workspace, inImage),
        ...timeZoneFailures(inImage),
      ];
      for (const key of ['vancouver', 'kiritimati', 'coyhaique', 'unknownZone'] as const) {
        if (inImage[key] !== workspace[key])
          problems.push(`${key}: image ${inImage[key]}, workspace ${workspace[key]}`);
      }
      check(problems.length === 0, problems.join('; '));
    },
  );

  await step('start Postgres', () => {
    ok(run('docker', compose('up', '--detach', '--wait', 'postgres')), 'compose up postgres');
    sql('app', 'CREATE DATABASE broken');
    sql('app', 'CREATE DATABASE sample');
    detail(sql('app', 'SHOW server_version'));
  });

  await step('migrate exits non-zero on an unreachable database and never prints its URL', () => {
    const result = run('docker', [
      'run',
      '--rm',
      '-e',
      `MIGRATION_DATABASE_URL=${unreachableUrl}`,
      image,
      'migrate',
    ]);
    const output = result.stdout + result.stderr;
    detail(output.trim());
    check(result.code !== 0, 'migrate exited 0 on an unreachable database', result);
    check(!output.includes('do-not-print'), 'migrate printed the connection string', result);
  });

  await step('a migration that fails halfway exits non-zero and leaves nothing behind', () => {
    const result = run('docker', migrateArgs('broken', 'migrations-broken'));
    detail(
      `exit ${String(result.code)}: ${(result.stdout + result.stderr).trim().split('\n').at(-1) ?? ''}`,
    );
    check(result.code !== 0, 'migrate exited 0 on a broken migration', result);
    const left = sql(
      'broken',
      "SELECT concat_ws(',', to_regclass('smoke_ok'), to_regclass('smoke_half'), to_regclass('pgmigrations'))",
    );
    // node-pg-migrate creates its history table before the run's transaction; nothing else stays.
    const recorded = left.includes('pgmigrations')
      ? sql('broken', 'SELECT count(*) FROM pgmigrations')
      : '0';
    detail(`tables left: ${left === '' ? 'none' : left}; migrations recorded: ${recorded}`);
    check(!left.includes('smoke_'), `the failed run left ${left}`);
    check(recorded === '0', `the failed run recorded ${recorded} migrations`);
  });

  await step(
    'an index built concurrently; a second run at the same time is refused; a third changes nothing',
    async () => {
      const first = runAsync('docker', migrateArgs('sample', 'migrations-sample'));
      const deadline = performance.now() + 30_000;
      while (
        sql('sample', "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND granted") !==
        '1'
      ) {
        check(performance.now() < deadline, 'the first run never took the advisory lock');
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      const second = run('docker', migrateArgs('sample', 'migrations-sample'));
      detail(
        `second run: exit ${String(second.code)}: ${(second.stdout + second.stderr).trim().split('\n').at(-1) ?? ''}`,
      );
      check(second.code !== 0, 'a second run beside the first exited 0', second);
      check(
        (second.stdout + second.stderr).includes('Another migration is already running'),
        'the second run failed for another reason',
        second,
      );
      const firstResult = await first;
      ok(firstResult, 'the first run');
      detail(`first run: ${firstResult.stdout.trim().split('\n').at(-1) ?? ''}`);
      check(
        sql('sample', 'SELECT count(*) FROM pgmigrations') === '3',
        'the first run did not record three migrations',
      );
      check(
        sql(
          'sample',
          "SELECT indisvalid FROM pg_index WHERE indexrelid = 'smoke_sample_label'::regclass",
        ) === 't',
        'the concurrent index is not valid',
      );
      detail('smoke_sample_label is valid');
      ok(run('docker', migrateArgs('sample', 'migrations-sample')), 'a third run');
      check(
        sql('sample', 'SELECT count(*) FROM pgmigrations') === '3',
        'a third run applied something',
      );
    },
  );

  await step('the real migrations on an empty database, twice: exit 0, then no change', () => {
    const dump = (): string =>
      ok(
        run(
          'docker',
          compose('exec', '-T', 'postgres', 'pg_dump', '-U', 'postgres', '--schema-only', 'app'),
        ),
        'pg_dump',
      )
        .split('\n')
        .filter((line) => !/^\\(un)?restrict /.test(line)) // a random key per dump since Postgres 18
        .join('\n');
    const first = run('docker', migrateArgs('app'));
    if (first.code !== 0)
      throw new SmokeFailure(
        'migrate failed on the real folder: stopping before the API starts',
        first,
      );
    detail(first.stdout.trim().split('\n').at(-1) ?? '');
    const before = dump();
    ok(run('docker', migrateArgs('app')), 'the second run');
    check(dump() === before, 'the second run changed the schema');
    detail(
      `${sql('app', 'SELECT count(*) FROM pgmigrations')} migrations recorded, schema unchanged`,
    );
  });

  await step('the API answers /health as a non-root user, with Node as PID 1', async () => {
    const started = performance.now();
    ok(
      run(
        'docker',
        compose('up', '--detach', '--wait', '--wait-timeout', '30', '--no-deps', 'api'),
      ),
      'compose up api',
    );
    summary.push(`healthy ${seconds(started)} after up`);
    const address = ok(run('docker', compose('port', 'api', '3000')), 'compose port');
    const response = await fetch(`http://${address}/health`);
    const body = (await response.json()) as { status?: string; commit?: string };
    detail(
      `GET /health ${String(response.status)} cache-control: ${response.headers.get('cache-control') ?? '-'} ${JSON.stringify(body)}`,
    );
    check(response.status === 200, `/health answered ${String(response.status)}`);
    check(response.headers.get('cache-control') === 'no-store', '/health may be cached');
    check(
      body.status === 'ok' && body.commit === commit,
      `/health reported ${JSON.stringify(body)}`,
    );
    const uid = ok(
      run('docker', compose('exec', '-T', 'api', 'node', '-p', 'process.getuid()')),
      'uid',
    );
    const pid1 = ok(run('docker', compose('exec', '-T', 'api', 'cat', '/proc/1/cmdline')), 'PID 1')
      .replaceAll('\0', ' ')
      .trim();
    detail(`uid ${uid}; PID 1: ${pid1}`);
    check(uid === apiUid, `the API runs as uid ${uid}`);
    check(pid1 === 'node apps/api/src/main.ts api', `PID 1 is ${pid1}`);
  });

  await step('SIGTERM stops the API cleanly', () => {
    const started = performance.now();
    ok(run('docker', compose('stop', '--timeout', '10', 'api')), 'compose stop');
    const stopped = seconds(started);
    const container = ok(run('docker', compose('ps', '--all', '--quiet', 'api')), 'compose ps');
    const code = ok(
      run('docker', ['inspect', '--format', '{{.State.ExitCode}}', container]),
      'docker inspect',
    );
    const logs = ok(run('docker', compose('logs', '--no-log-prefix', 'api')), 'compose logs');
    detail(logs.split('\n').slice(-2).join(' | '));
    summary.push(`stop ${stopped}`);
    check(code === '0', `the API exited ${code} on SIGTERM`);
    check(
      logs.includes('stopping on SIGTERM') && logs.includes('stopped (clean)'),
      'the API did not report a clean stop',
    );
  });
}

function teardown(): void {
  run('docker', compose('down', '--volumes', '--remove-orphans', '--timeout', '0'));
}

process.on('SIGINT', () => {
  teardown();
  process.exit(130);
});

const started = performance.now();
try {
  await smoke();
  console.log(`\nAPI smoke passed in ${seconds(started)}: ${summary.join(', ')}`);
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof SmokeFailure && error.result !== undefined) {
    const output = `${error.result.stdout}\n${error.result.stderr}`.trim();
    if (output !== '')
      console.error(
        output
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n'),
      );
  }
  process.exitCode = 1;
} finally {
  teardown();
}
