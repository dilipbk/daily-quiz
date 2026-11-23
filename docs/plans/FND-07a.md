# FND-07a API container, migration step and smoke job: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ticket:** FND-07a (the local half of roadmap row FND-07, split on 2026-11-23) · **Status:** APPROVED by the PM on 2026-11-23, D1 to D6 as recommended, section 2 standing · **Owner:** backend engineer · **Size:** M, confirmed: one new app (`apps/api`), one new CI job, and one line in `vitest.config.js`. It changes no schema and no contract, and it carries no auth, money or privacy risk. It becomes L only if D1 puts `/health` into `packages/contracts`.

**Goal:** One container image of `@repo/api` that a laptop and CI build with one command. It answers `GET /health` as a non-root user, stops cleanly on SIGTERM and runs a `migrate` step. One smoke script proves all of this on every pull request, with no account and no secret.

**Architecture:** A Hono app with one route, run by Node 26.13.1 straight from TypeScript source (built-in type stripping) as PID 1. The image is `debian:trixie-slim` plus the exact Node binary that pnpm provisions from `pnpm-lock.yaml`, so the version stays written once, in `package.json`. `migrate` is the same image with a different argument: node-pg-migrate on the `pg` driver, reading its own `MIGRATION_DATABASE_URL`. A compose file starts Postgres 18.7. A TypeScript smoke script builds the image, runs the checks and tears everything down. The laptop and the new `api-smoke` CI job run that same script.

**Tech stack (registry checked 2026-11-23):** hono `^4.13.20` (4.13.21 was published today, so the one-day `minimumReleaseAge` holds it back until tomorrow; Hono 5 is still `5.0.0-rc.1`) · @hono/node-server `^2.1.11` · pg `^8.23.1` and @types/pg `^8.23.1` · node-pg-migrate `^9.0.0` · Postgres 18.7 · Node 26.13.1, pnpm 11.28.9 · Docker 28.0.4 with Compose 2.34 on this Mac, and Docker 28.0.4 with Compose 2.38.2 on the `ubuntu-24.04` runner.

**Spec and references:** spec §21.2 (Environments line), SEC-01 · roadmap §2 rule 6, §3.1 (API table, CI/CD row), §4.1–4.2, G0, rows FND-04, FND-07, BE-01, BE-02, BE-06, §7, §9 · ADRs 0001, 0002, 0005, 0023, 0051–0055, 0065, 0069, 0071 · brief: `brief-FND-07a.md` in the PM's notes folder.

**Research notes** (sources quoted, checked 2026-11-23), in this group's shared notes folder: `fnd-07a-research-node-image-pnpm-ci.md` and `fnd-07a-research-hono-postgres-migrations.md`.

**Branch:** `chore/FND-07a-api-container-local`, cut from `origin/main` at `95b6fd9`.

---

## Changes during the build

The plan below is as approved. These are the places where what was built differs from it.

1. **The PM's rulings are in the ADRs.**
   - ADR 0079 states the `/health` exception as covering operations probes only, not product routes. It also carries the three "never" rules and names the smoke step that catches a break.
   - ADR 0080 says it fills a gap and supersedes nothing, and that ADR 0054's "move to 1.0" is about the builder's version.
   - `main.ts` dispatches from a table of commands, so `worker` is one more entry.
2. **The stop needed a second step** (Task 2). The test `lets a request already in flight finish before it stops` failed against `server.close()` alone. It returned `forced` after 4 s, because a keep-alive connection that carried a request when the stop began turned idle after `close()` had already dropped the idle ones. `startServer` now closes idle connections each time a response finishes while stopping.
3. **The broken-migration case leaves node-pg-migrate's history table** (Task 5, step 5). The table is created before the run's transaction, so the step asserts that no `smoke_` table remains and that the table records no migration.
4. **The smoke's command helper is `run`, not `exec`.** Every command is a program with an argument array and no shell. The new name keeps it from being mistaken for `child_process.exec`.
5. **`pnpm verify` without Docker was proven with a `docker` shim, not by stopping Docker Desktop.** The shim records any call and `DOCKER_HOST` points nowhere. Verify passed with no call recorded, and other sessions' containers kept running.
6. **ADR 0080 adds a note for BE-02:** start a concurrent-index migration with `DROP INDEX CONCURRENTLY IF EXISTS`, because a failed concurrent build leaves an invalid index. Where it rests on node-pg-migrate's source and wasn't tested here, the ADR says so.

---

## 1. Decisions for the PM

Each decision gives a recommendation and the evidence behind it. Approving the plan approves these six. Section 2 lists smaller choices; they don't need a ruling unless you object.

### D1. `/health` sits outside the `packages/contracts` registry. Recommended.

`/health` is an operations probe for the platform and the smoke script, not part of the product's API. It stays out of the registry and the OpenAPI document. It is public, answers `Cache-Control: no-store`, and declares no access level, because BE-01's access-level middleware will not exist when it ships. ADR 0079 records this exception to roadmap §7 ("an endpoint exists in `packages/contracts` first"), and BE-01 must mount its 404 and problem handler so that `/health` keeps answering.

- **Why:** the registry's `areas` list (`config`, `identity`, `content`, `dailies`, `sessions`, `progress`) has no operations area. Adding one changes `packages/contracts`, which makes this ticket L, crosses packages, and collides with pull request 9. No app or fake server will ever call `/health`.
- **Alternative:** an `ops` area holding `ops.health` in `contracts`, for one source of truth. Its cost is the L ticket, plus an endpoint that every client, generator and fake server would have to skip.

### D2. `/health` checks liveness only and reports the build's commit. Recommended.

`GET /health` answers `200 {"status":"ok","commit":"<sha>"}` with no database call. The commit comes from the `GIT_COMMIT` build argument, and is `"unknown"` when the build passed none.

- **Why:** in FND-07b the platform takes a machine out of rotation when its check fails. A check that called the database would take every machine out at once during a database blip. Those machines would recover by themselves, and they could still answer `/config` from the CDN's ETag path. The commit lets FND-07b prove that a merge reached staging (the FND-07b done-when).
- **Alternative:** add a readiness check that pings Postgres, at a separate path, when FND-07b or BE-02 needs one. Fly's HTTP checks can point at either path.

### D3. The image runs the TypeScript source with Node's type stripping, without a bundler. Recommended.

The image holds a filtered production install in pnpm's workspace layout, so `apps/api/node_modules/@repo/game-rules` is a symlink to `/app/packages/game-rules`. Node 26.13.1 strips types by default ("Stability: 2 - Stable", `process.features.typescript === 'strip'`). The workspace packages are source-only and already follow its rules: `.ts` extensions on all 226 relative imports, plus `erasableSyntaxOnly` and `verbatimModuleSyntax`.

Evidence, run today on the pinned Node 26.13.1:

| Layout | Result |
|---|---|
| A package reached through a symlink into `node_modules` (pnpm workspace layout) | Runs. Node checks the real path, `/app/packages/…` |
| Real files under `node_modules` (the output of `pnpm deploy`, also with `--legacy`) | `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` |
| The symlinked layout with `--preserve-symlinks` | `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` |
| Spike image (Debian 13 + pnpm's Node 26.13.1 + filtered install) | `localDateOf` from `@repo/game-rules` gives `2026-11-02` for Vancouver; `/health` answers 200 as uid 10001 |

- **Why:** there is no build step and no second tool. Type stripping replaces types with spaces, so stack traces point at real source lines, and BE-01's Sentry needs no source maps. The image runs the same code the tests run, and startup is quick (healthy 360 ms after `docker run` in the spike).
- **Cost:** a rule to keep. Never use `pnpm deploy`, `injectWorkspacePackages` or `--preserve-symlinks` for this image. ADR 0079 says so, and the smoke script imports `@repo/game-rules` inside the image on every run, so a break shows up in CI. The image also carries the source of every workspace package, about 1 MB.
- **Alternative:** bundle with esbuild or tsdown into one file. The image would be smaller, but the bundler would need a new ADR, source maps for Sentry, and a second way of running the same code.
- `apps/api/tsconfig.json` uses `module` and `moduleResolution` `nodenext`, so `tsc` refuses an import that Node can't run (checked: an extensionless relative import fails with TS2835). `packages/contracts` already type-checks cleanly under `nodenext`.

### D4. Migrations use node-pg-migrate 9.0.0 on `pg` 8.23.1, one driver for everything; concurrent indexes are allowed. Recommended.

- **Driver: `pg`.** pg-boss 12.39.0 depends on `pg ^8.23.1`. Drizzle supports `node-postgres`. node-pg-migrate's peer range is `pg >=4.3.0 <9.0.0`. One driver serves all three.
- **Why not Drizzle's migrator.** In drizzle-orm 0.45.4 (`pg-core/dialect.ts`), all pending migrations run in one transaction, nothing lets one migration opt out, and no lock is taken. 1.0.0-rc.6 behaves the same, and its release notes removed `.concurrently()` from indexes because "migrations run inside a transaction". Issues #860 and #874 are still open. Postgres refuses `CREATE INDEX CONCURRENTLY` inside a transaction, so Drizzle's migrator can't meet the roadmap §7 guardrail. Drizzle stays the query builder (ADR 0054). If BE-02 likes, `drizzle-kit generate` can still draft SQL for a migration.
- **How node-pg-migrate meets it.** Migrations are `.sql` files with `-- Up Migration` and `-- Down Migration` sections. A migration that builds an index concurrently is a small `.ts` file that calls `pgm.noTransaction()`. In 9.0.0 a `.sql` file can't opt out; that arrives in 10.0 (alpha), and ADR 0080 notes it. The tool takes a session-level advisory lock, and it checks that applied migrations are still in order.
- **Settings, passed explicitly** (the source and the docs disagree on one default): `singleTransaction: true`, so a release's migrations apply together or not at all, except where a concurrent-index migration commits the batch before itself. Also `checkOrder: true`, `advisoryLockMode: 'fail'`, the history table `public.pgmigrations`, and our own connected `pg.Client` (`connectionTimeoutMillis: 10_000`), so the tool never reads `DATABASE_URL` on its own.
- **Postgres 18.7** locally and in CI. It is Neon's default for new projects; 19.0 came out on 2026-11-19.
- **Alternatives** (for ADR 0080): Graphile Migrate (stable line from 2022, 2.0 still in RC), dbmate and Atlas (Go binaries, a second toolchain in the image; Atlas's community build lacks views and functions), Flyway (Java), postgres-shift (postgres.js only), umzug (no transactions or lock built in), our own runner (about 100 lines we would have to trust).

### D5. Until BE-02, the API's tests run in the root Vitest run and need no Docker. Recommended.

`vitest.config.js` gains `'apps/api/{src,tests}/**/*.test.ts'` in its `include`. It names `apps/api` and not `apps/*`, because FND-05's `apps/mobile` runs its tests on Jest. `pnpm verify` then type-checks, lints, formats and tests `apps/api` with no Docker. The database path is proven only by the smoke script. BE-02 replaces the line with the API's own Vitest project on Testcontainers (ADR 0002, 0065).

### D6. Make `api-smoke` a required check after it has run green on this pull request and on `main`. Recommended; for the PM and the owner to apply.

The job runs on every pull request and every push to `main`, with no path filters. A smoke that only reports can go red unnoticed. Making it required takes one entry in `.github/rulesets/main.json` (`{ "context": "api-smoke", "integration_id": 15368 }`), applied by the owner with `gh api`. I don't make that change here (working rules). Two costs: every pull request waits for the job (measured on this pull request, expected 2–4 minutes), and anonymous Docker Hub pulls (three images per run) are a source of flakes I could not measure. If those pulls flake, FND-07b's registry can mirror the images.

## 2. Further choices, recorded in ADR 0079 and 0080

1. **Where the image's Node comes from.** The build runs `pnpm install --frozen-lockfile --filter .` in a builder stage. pnpm then downloads Node 26.13.1 from the URL in `pnpm-lock.yaml` and checks its sha256 there, even when the builder's own Node has the same version. That binary is copied to `/usr/local/bin/node`. The version stays written only in `package.json` (ADR 0001's "change the one line"); the base images are pinned by digest and don't change with it. Node 26's official binary needs `libatomic1`, which `debian:trixie-slim` lacks; checked on arm64 and x64, and the runtime stage installs it with `apt-get`. Builder stages run on `node:26-trixie-slim@sha256:…`, which brings npm (to install pnpm at the `packageManager` version) and libatomic, and is never shipped.
   - **Alternative:** use the official `node:26.13.1-trixie-slim@sha256:…` as the runtime. It is simpler, but the version would be written a second time (the tag and its digest), and the runtime would carry npm. The pin check in Task 5 would catch drift, but "change the one line" would no longer hold.
2. **The runtime image.** `debian:trixie-slim@sha256:a72b4433…` (Debian 13.7), `libatomic1`, a system user and group `api` with uid and gid 10001, `USER 10001:10001`. The application files are owned by root and read-only for the `api` user. `ENTRYPOINT ["node", "apps/api/src/main.ts"]`, `CMD ["api"]`, so `docker run <image> migrate` runs the migrations. Fly's `release_command` replaces CMD and keeps ENTRYPOINT, so this works there too. The image sets neither `TZ` nor `NODE_ICU_DATA`. Spike size: 302 MB, of which the Node binary is 144 MB.
3. **Signals.** Node is PID 1 and handles both SIGTERM (Docker's default) and SIGINT (Fly's default `kill_signal`). It stops accepting connections, closes idle keep-alive connections, lets in-flight requests finish, then exits 0. After 4 seconds it closes whatever is left and exits 1. Fly's default `kill_timeout` is 5 s, so FND-07b must not lower it. No `tini`: the process starts no children. In the spike, SIGTERM stopped the container in 234 ms with exit 0, and an idle keep-alive connection didn't delay that (204 ms).
4. **Variables.** `PORT`: 3000 when unset; anything other than a whole number from 1 to 65535 refuses to start. `GIT_COMMIT`: `"unknown"` when unset or empty; anything other than 7 to 40 lowercase hex characters refuses to start. `MIGRATION_DATABASE_URL`: required by `migrate`; anything other than a `postgres://` or `postgresql://` URL refuses to start. Every error names the variable and never prints its value. TLS is switched by the URL's `sslmode` (`disable` locally). FND-07b uses Neon's direct (non-pooler) string with `sslmode=verify-full`, because the advisory lock and `CREATE INDEX CONCURRENTLY` don't work through PgBouncer in transaction mode. `DATABASE_URL`, for the application's role, arrives with BE-02, the first code that reads it.
5. **Concurrent runs.** A second `migrate` started while one holds the lock exits non-zero ("Another migration is already running") and changes nothing. FND-07b keeps releases in sequence with a workflow concurrency group, rather than letting a run wait without limit.
6. **No layer cache in CI.** It is plain `docker build`, with no new third-party action. FND-07b may add `docker/setup-buildx-action` and the `type=gha` cache when it pushes to a registry. Today's pins: v4.4.1 `f87e5991a6d7451dcb8d9637bfbc97413f497069` and build-push v7.4.0 `c3c9e263c25d99ce0380d002d59b67737d91b0dc`.
7. **The smoke script is TypeScript** (`apps/api/smoke/smoke.ts`), run by the workspace Node through `pnpm --filter @repo/api smoke`. Checked: a filtered pnpm script runs on pnpm's Node 26.13.1, not the system's 22.14.0. `pnpm verify` type-checks and lints it, and its pure checks have unit tests.
8. **Compose lives at `apps/api/compose.yaml`** with build context `../..`. Postgres runs on `tmpfs` and is not published to the host. The API is published on `127.0.0.1:${API_HOST_PORT:-3000}`; the smoke script passes `0` for a free port (checked: Compose then picks one, such as `127.0.0.1:55000`). For a local `up`, `api` waits for `migrate` to complete successfully.

## 3. Global constraints

- Node runs exactly `devEngines.runtime.version` in `package.json` (26.13.1); no other file states it.
- Every base image is pinned by digest, and every action by commit SHA. `ci.yml` keeps `permissions: contents: read` and uses no `secrets.*` and no `pull_request_target`.
- `verify` is not renamed, gets no path filters, and `.github/rulesets/main.json` is not touched.
- No file in `packages/*`, `docs/roadmap.md`, `docs/traceability.md` or `docs/design/` changes. Root `package.json`, `eslint.config.js` and `.gitignore` stay untouched (FND-05 rewrites them).
- Nothing prints a connection string. `.env.example` holds names and local throwaway values only.
- `pnpm verify` needs no Docker.
- Commits are conventional and end `(FND-07a)`. ADRs use numbers 0079 and 0080 only, with status `Proposed`.

## 4. Review focus

These are the inputs most likely to bite that the done-when lines don't name. Each has a test in the task shown.

1. **A request in flight at SIGTERM** should finish, not be cut, and an idle keep-alive connection must not hold the stop open (Task 2: `server.test.ts`).
2. **`DATABASE_URL` set and `MIGRATION_DATABASE_URL` missing**: `migrate` must refuse rather than fall back to the application's role (Task 3: `migrate.test.ts`).
3. **A migration that fails halfway** must leave neither its own changes nor those of earlier migrations in the same run (Task 5: the smoke's broken fixture, two files).
4. **A `.ts` workspace file that lands under `node_modules`** (someone switches to `pnpm deploy`) must fail CI, not production (Task 5: the smoke imports `@repo/game-rules` inside the image).
5. **An image whose Node, ICU or zone data differs from the workspace's** must fail the smoke, even when the dates still happen to match (Task 5: `runtimeMismatches` unit test and smoke step).

---

## 5. Files

| File | Responsibility |
|---|---|
| `apps/api/package.json` | `@repo/api`: dependencies, plus `typecheck`, `start`, `migrate` and `smoke` scripts |
| `apps/api/tsconfig.json` | Extends the base; `nodenext`, `types: ["node"]`; includes `src`, `tests`, `smoke`, `migrations` |
| `apps/api/src/app.ts` | `createApp({ commit })`: the Hono app with `GET /health`. BE-01 builds on it |
| `apps/api/src/env.ts` | `readPort`, `readCommit`, `readMigrationUrl`, `ConfigError` |
| `apps/api/src/server.ts` | `startServer`, `stopOnSignals`: listen, clean stop, deadline |
| `apps/api/src/migrate.ts` | `runMigrate`: node-pg-migrate on our own `pg.Client`, returns an exit code |
| `apps/api/src/main.ts` | `node src/main.ts api|migrate`: reads the environment, dispatches, sets the exit code |
| `apps/api/migrations/.gitkeep` | The real migrations folder. It is empty: no product schema (BE-02) |
| `apps/api/tests/*.test.ts` | Unit tests, no Docker: `health`, `env`, `server`, `migrate`, `smoke-checks` |
| `apps/api/Dockerfile` | Stages `pnpm` → `node` → `deps` → `runtime` (section 2, items 1–2) |
| `apps/api/compose.yaml` | `postgres` (18.7, healthcheck `pg_isready -h 127.0.0.1`), `migrate`, `api` (healthcheck via `node -e fetch(...)`) |
| `apps/api/smoke/smoke.ts` | The smoke script (Task 5) |
| `apps/api/smoke/checks.ts` | Pure checks: `runtimeMismatches`, `timeZoneFailures` |
| `apps/api/smoke/tz-check.ts` | Prints the runtime and time-zone report, on the host and inside the image |
| `apps/api/smoke/fixtures/migrations-broken/` | `1_ok.sql` (creates `smoke_ok`), `2_broken.sql` (creates `smoke_half`, then a syntax error) |
| `apps/api/smoke/fixtures/migrations-sample/` | `1_table.sql`, `2_index_concurrently.ts` (`pgm.noTransaction()`), `3_hold_lock.sql` (`SELECT pg_sleep(3)`) |
| `.dockerignore` (root) | Allowlist: root manifests, `packages/`, `apps/api/`; drops `node_modules`, `tests`, `smoke`, `.env*` |
| `.env.example` (root) | `PORT`, `GIT_COMMIT`, `MIGRATION_DATABASE_URL`, each with a local throwaway value |
| `vitest.config.js` | One more `include` entry (D5) |
| `.github/workflows/ci.yml` | New job `api-smoke` (Task 6) |
| `README.md` | "Run the API locally" section; `apps/api` row in the layout says FND-07a |
| `docs/adr/0079-…`, `docs/adr/0080-…` | The image; the migration step |
| `pnpm-lock.yaml` | From `pnpm install`, never edited by hand |

## 6. Tasks

### Task 1: `@repo/api` with `GET /health`

**Files:** `apps/api/{package.json,tsconfig.json}`, `src/app.ts`, `src/env.ts`, `tests/health.test.ts`, `tests/env.test.ts`, `vitest.config.js`, `pnpm-lock.yaml`.

**Produces:** `createApp(options: { commit: string }): Hono`; `readPort(env: NodeJS.ProcessEnv): number`; `readCommit(env): string`; `readMigrationUrl(env): string`; `class ConfigError extends Error`.

- [ ] Add the package with `pnpm add --filter @repo/api hono@^4.13.20 @hono/node-server@^2.1.11 @repo/game-rules@workspace:*` (`-D @repo/config@workspace:*`). Check the registry again first, and record the versions that actually installed.
- [ ] Write the failing tests:
  - `health.test.ts`:
    - `GET /health answers 200 with status ok and the build's commit`: `createApp({ commit: 'abc1234' }).request('/health')` gives 200 and `{ status: 'ok', commit: 'abc1234' }`.
    - `GET /health is never cached`: the `cache-control` header equals `no-store`.
  - `env.test.ts`:
    - `PORT defaults to 3000 when unset`.
    - `PORT accepts a whole number from 1 to 65535` (`'8080'` → 8080).
    - `PORT refuses anything else and names the variable, not the value`: `'0'`, `'65536'`, `'80.5'`, `'abc'`, `''`, `' 80'` each throw `ConfigError` whose message contains `PORT` and not the value.
    - `GIT_COMMIT is "unknown" when unset or empty`.
    - `GIT_COMMIT accepts 7 to 40 lowercase hex characters and refuses anything else`.
    - `MIGRATION_DATABASE_URL is required and never borrowed from DATABASE_URL`.
    - `MIGRATION_DATABASE_URL must be a postgres URL, and the error never contains it`: `'postgresql://u:do-not-print@h/db?x'` passes unchanged; `'mysql://u:do-not-print@h/db'` and `'do-not-print'` throw without `do-not-print` in the message.
- [ ] Run `pnpm exec vitest run apps/api`. Expected: fails, because the modules don't exist.
- [ ] Implement `app.ts` and `env.ts`, and add `'apps/api/{src,tests}/**/*.test.ts'` to `vitest.config.js`.
- [ ] Run `pnpm verify`. Expected: green, with the new test names in the output.
- [ ] Commit `feat(api): GET /health on a Hono app (FND-07a)`.

### Task 2: Node entry that listens and stops cleanly

**Files:** `src/server.ts`, `src/main.ts`, `tests/server.test.ts`.

**Consumes:** `createApp`, `readPort`, `readCommit`. **Produces:**
- `startServer(fetch: (request: Request) => Response | Promise<Response>, options: { port: number; hostname: string }): Promise<RunningServer>`
- `interface RunningServer { readonly port: number; stop(deadlineMs: number): Promise<'clean' | 'forced'> }`
- `stopOnSignals(server: RunningServer, options: { on: (signal: 'SIGTERM' | 'SIGINT', listener: () => void) => void; deadlineMs: number; exit: (code: number) => void; log: (line: string) => void }): void`
- `SHUTDOWN_DEADLINE_MS = 4_000`

- [ ] Write the failing tests. They use real sockets on `127.0.0.1` port 0 and a test app with a route that waits for a promise the test controls:
  - `serves the app on the port it was given`.
  - `stops at once and "clean" with nothing in flight`.
  - `closes an idle keep-alive connection instead of waiting for it`: a keep-alive agent has finished one request; `stop(4_000)` resolves `'clean'` within 500 ms.
  - `lets a request already in flight finish before it stops`: the request starts, then `stop` is called, then the route is released; the client gets 200 and `stop` resolves `'clean'`.
  - `closes what is left after the deadline and says "forced"`: the route never resolves; `stop(100)` resolves `'forced'`.
  - `stops once on SIGTERM or SIGINT and exits 0 when clean, 1 when forced`: the test's own `on` and `exit`; two signals in a row call `stop` once.
- [ ] Run them. Expected: fail.
- [ ] Implement:
  - `startServer` with `serve()` from `@hono/node-server`. `stop` uses `server.close()`; on the deadline it calls `closeAllConnections()`.
  - `main.ts`: `api` reads the environment (a `ConfigError` prints its message and exits 1), listens on `0.0.0.0:PORT`, logs one line on start and one on stop, and wires `stopOnSignals` to `process`. An unknown command prints `usage: main.ts api|migrate` and exits 64.
- [ ] Run `pnpm verify` and `PORT=3999 pnpm --filter @repo/api start`; `curl` it; send Ctrl-C. Expected: 200, then a "stopped" line and exit 0.
- [ ] Commit `feat(api): listen on PORT and stop cleanly on SIGTERM (FND-07a)`.

### Task 3: `migrate` command

**Files:** `src/migrate.ts`, `src/main.ts`, `migrations/.gitkeep`, `tests/migrate.test.ts`, `pnpm-lock.yaml`.

**Produces:** `runMigrate(options: { env: NodeJS.ProcessEnv; dir: string; log: (line: string) => void }): Promise<number>`. The returned number is the process exit code.

- [ ] Run `pnpm add --filter @repo/api pg@^8.23.1 node-pg-migrate@^9.0.0` and `-D @types/pg@^8.23.1`, after checking the registry. If pnpm stops on an unapproved build script, read the script before adding the package to `allowBuilds`.
- [ ] Write the failing tests (no Docker):
  - `refuses to start without MIGRATION_DATABASE_URL, even when DATABASE_URL is set`: returns 1, and the log names `MIGRATION_DATABASE_URL`.
  - `exits 1 when the database is unreachable and never prints the connection string`: URL `postgresql://smoke:do-not-print@127.0.0.1:1/none?sslmode=disable` returns 1, and no logged line contains `do-not-print`.
- [ ] Run them. Expected: fail.
- [ ] Implement `runMigrate`:
  - It connects a `pg.Client` (`connectionString`, `connectionTimeoutMillis: 10_000`, `application_name: 'daily-quiz-migrate'`).
  - It calls `runner({ dbClient, dir, direction: 'up', migrationsTable: 'pgmigrations', singleTransaction: true, checkOrder: true, advisoryLockMode: 'fail', logger })`. Its logger prints the tool's messages, which hold migration names and SQL, never the URL.
  - It always closes the client, and on failure logs `migrate failed: <message>`.
  - `main.ts migrate` passes `fileURLToPath(new URL('../migrations', import.meta.url))` and sets `process.exitCode`.
- [ ] Run `pnpm verify`. Expected: green.
- [ ] Commit `feat(api): migrate command with its own connection variable (FND-07a)`.

### Task 4: The image

**Files:** `apps/api/Dockerfile`, `.dockerignore`, `docs/adr/0079-the-api-image.md` (draft).

- [ ] Look up today's index digests for `node:26-trixie-slim`, `debian:trixie-slim` and `postgres:18.7-trixie` (`docker buildx imagetools inspect`). On 2026-11-23 they were `e6bedef2…`, `a72b4433…` and `eb63372c…`. Write them in full, each with its tag in a comment.
- [ ] Write the Dockerfile:
  - `pnpm` stage: `npm install -g pnpm@<packageManager version read from package.json>`.
  - `node` stage: root `--frozen-lockfile --ignore-scripts --filter .` install, then copy `pnpm exec node -p process.execPath` to `/opt/node/bin/node`.
  - `deps` stage: `pnpm fetch --prod` on the lockfile alone, then copy `packages/` and `apps/api/`, then `pnpm install --offline --frozen-lockfile --ignore-scripts --prod --filter-prod "@repo/api..."`.
  - `runtime` stage: as in section 2, items 1–2, with `ARG GIT_COMMIT=""` last so a new commit reuses every other layer.
- [ ] Run `docker build -f apps/api/Dockerfile -t daily-quiz-api .` from a clean clone of the branch (`git clone` into the scratchpad, no `pnpm install`). Expected: exit 0. Record the time and the size.
- [ ] Run `docker run --rm daily-quiz-api nope`. Expected: usage, exit 64.
- [ ] Commit `build(api): container image that starts as api or migrate (FND-07a)`.

### Task 5: Compose file, smoke script and its checks

**Files:** `apps/api/compose.yaml`, `apps/api/smoke/{smoke.ts,checks.ts,tz-check.ts}`, `apps/api/smoke/fixtures/**`, `tests/smoke-checks.test.ts`, `.env.example`, `README.md`.

**Produces:**
- `interface RuntimeReport { node: string; icu: string; tz: string; vancouver: string; kiritimati: string; coyhaique: string; unknownZone: string; tzEnv: string | null; icuDataEnv: string | null }`
- `runtimeMismatches(pinned: string, host: RuntimeReport, image: RuntimeReport): string[]`
- `timeZoneFailures(report: RuntimeReport): string[]`

- [ ] Write the failing tests in `smoke-checks.test.ts`:
  - `runtimeMismatches is empty when the image runs the pinned Node with the workspace's ICU and zone data`.
  - `runtimeMismatches names the Node version when it differs from devEngines.runtime.version`: image `v26.13.0` against pin `26.13.1` gives exactly one entry, which names both values.
  - `runtimeMismatches names ICU or tz when they differ from the workspace Node's`: tz `2026e` against `2024b` is flagged.
  - `timeZoneFailures is empty for the dates ADR 0005 expects`: Vancouver `2026-11-02`, Kiritimati `2026-06-16`, Coyhaique a date, unknown zone `RangeError`, `TZ` and `NODE_ICU_DATA` unset.
  - `timeZoneFailures names a wrong date, a refused Coyhaique, an accepted unknown zone and a set TZ`.
- [ ] Run them. Expected: fail. Then implement `checks.ts` and `tz-check.ts`. The latter prints one `RuntimeReport` as JSON, using `localDateOf(Date.UTC(2026, 10, 2, 7, 30), 'America/Vancouver')`, `(Date.UTC(2026, 5, 15, 10, 30), 'Pacific/Kiritimati')`, the same instant for `America/Coyhaique`, and `'Mars/Olympus'` for the unknown zone.
- [ ] Write `compose.yaml` and `smoke.ts`. The script prints `▶`/`✓`/`✗` for each step with its time, throws at the first failure, and tears down in `finally` (`docker compose down --volumes --remove-orphans`), also on SIGINT. Its compose project name is unique to the run. Steps:
  0. **Preflight:** `docker` and `docker compose` answer; the host's `process.version` equals the pin.
  1. **Build:** `docker build -f apps/api/Dockerfile --build-arg GIT_COMMIT=<git rev-parse HEAD> -t daily-quiz-api:smoke .`
  2. **Node pin:** `tz-check.ts` on the host, and inside the image (the file bind-mounted read-only into `/app/apps/api/smoke/`, run with `--entrypoint node`). `runtimeMismatches` and `timeZoneFailures` must both be empty.
  3. **Postgres:** `up -d --wait postgres`; create the databases `broken` and `sample`.
  4. **Unreachable database:** `migrate` with `postgresql://smoke:do-not-print@127.0.0.1:1/none?sslmode=disable` exits non-zero, and its output lacks `do-not-print`.
  5. **Broken migration** (on `broken`, the fixture mounted over `/app/apps/api/migrations`): non-zero exit; `to_regclass('smoke_ok')` and `to_regclass('smoke_half')` are both null.
  6. **Concurrent index and lock** (on `sample`):
     - Run A starts in the background.
     - Once `pg_locks` shows the advisory lock (deadline 20 s), run B exits non-zero with "Another migration is already running".
     - Run A exits 0, and `pgmigrations` has three rows.
     - The index is valid (`pg_index.indisvalid`).
     - Run C exits 0 and still leaves three rows.
  7. **Real folder, empty database `app`:** run 1 exits 0. `pg_dump --schema-only` and the row count of `pgmigrations`; run 2 exits 0; both are unchanged. If run 1 fails, the step prints `stopping before the API starts`.
  8. **API:** `up -d --wait --wait-timeout 30 --no-deps api`; then, with `fetch` from the host:
     - `/health` answers 200 with `cache-control: no-store` and `commit` equal to `HEAD`;
     - `process.getuid()` inside the container is 10001;
     - `/proc/1/cmdline` is `node apps/api/src/main.ts api`.
  9. **SIGTERM:** `docker compose stop -t 10 api`; the exit code is 0 (`docker inspect`); the logs hold the "stopped" line; the time to stop is printed.
  10. **Summary:** build time, image size, time to healthy, time to stop, total.
- [ ] Add `"smoke": "node smoke/smoke.ts"` to `apps/api/package.json`, the "Run the API locally" section to `README.md` (Docker is needed for this section only; `pnpm --filter @repo/api smoke`; `docker compose -f apps/api/compose.yaml up --build`; the build command), and `.env.example`.
- [ ] Run `pnpm verify`, then `pnpm --filter @repo/api smoke`. Expected: both green. Keep the output for the report.
- [ ] Run the two red cases locally and revert both:
  - break `/health` (answer 500): expected ✗ at step 8;
  - add a broken `.sql` to `apps/api/migrations`: expected ✗ at step 7 with `stopping before the API starts`, and no `api` container ever created.
  
  Keep both outputs.
- [ ] Commit `test(api): smoke script for the image, migrations and time zones (FND-07a)`.

### Task 6: CI job, ADRs and review

**Files:** `.github/workflows/ci.yml`, `docs/adr/0079-the-api-image.md`, `docs/adr/0080-migrations-with-node-pg-migrate.md`.

- [ ] Add the job `api-smoke` beside `verify`:
  - `name: api-smoke`, `runs-on: ubuntu-24.04`, `timeout-minutes: 15`, `env: HUSKY: 0`.
  - The same three action SHAs as `verify`; checkout with `persist-credentials: false`.
  - `pnpm install --frozen-lockfile`, then `pnpm --filter @repo/api smoke`.
  - A comment says it isn't a required check yet and points to D6.
  - Nothing else in the file changes.
- [ ] Finish ADR 0079 (base, Node provisioning, type stripping and its rule, commands, `/health` and D1–D2, signals, what FND-07b will probably change: registry push and tags, the commit wiring, a build cache, `kill_signal` and `kill_timeout`, an amd64-only build) and ADR 0080 (runner, driver, variables, transactions, lock, direct connection, Postgres 18.7, what BE-02 does next). Both `Proposed`.
- [ ] Run `security-review` on the Dockerfile, `.dockerignore`, compose file and workflow. Fix what it finds.
- [ ] Run `grep -rnE 'secrets\.|pull_request_target|permissions' .github/workflows/ci.yml` and `grep -rnE 'postgres(ql)?://' --exclude-dir=node_modules .` and keep the output. Expected: only `contents: read`, and connection strings only as local throwaway values.
- [ ] Re-read the whole diff.
- [ ] Commit `ci: run the API smoke on every pull request and on main (FND-07a)` and `docs(adr): 0079 the API image, 0080 the migration step (FND-07a)`.

### Task 7: Pull request and report

- [ ] Check that `git config user.email` ends in `@users.noreply.github.com` (checked today: it does). Rename the branch to `chore/FND-07a-api-container-local` if needed, merge `origin/main` (on a lockfile conflict, run `pnpm install`; never edit the lockfile by hand), push, and open the pull request citing §21.2 and SEC-01.
- [ ] Look at CI once, when it has finished. Record `api-smoke`'s duration and the x64 build's output. If the branch is BEHIND, run `gh pr update-branch <n>`.
- [ ] Report `TICKET FND-07a: DONE` in the team guide's format.

## 7. Done-when and how each line is proven

| # | Done when | Proof |
|---|---|---|
| 1 | One command builds the image from a clean checkout, arm64 and x64 | `docker build -f apps/api/Dockerfile -t daily-quiz-api .` output from a fresh clone on this Mac (Task 4); smoke step 1 in the CI log (x64) |
| 2 | The image runs the pinned Node; a check fails when it differs | Smoke step 2 output; the tests `runtimeMismatches names the Node version…` and `…ICU or tz…` (inside `pnpm verify`) |
| 3 | `/health` 200 as non-root; clean exit on SIGTERM | The test `GET /health answers 200…`; smoke steps 8–9 (status, uid 10001, PID 1 command, exit 0, milliseconds to stop) |
| 4 | Migrate: 0 on an empty database, no change on a second run, non-zero on broken or unreachable, smoke stops before the API | Smoke steps 4–7; the local red case for a broken migration in the real folder |
| 5 | `localDateOf` and ICU/tz inside the image equal the workspace Node's | Smoke step 2's two reports in the CI log; the `timeZoneFailures` tests |
| 6 | CI runs the smoke on pull requests and `main` and goes red on a broken route or migration | The green `api-smoke` run on this pull request (and on `main` after the merge); the two local red outputs |
| 7 | `pnpm verify` green, covering `apps/api`, without Docker | Its output with the new test names, run once with Docker Desktop stopped |
| 8 | No secret exists | The two `grep` outputs from Task 6; the workflow diff; the unit test that `do-not-print` never appears; SEC-01, roadmap §7 |
| 9 | ADR 0079 and 0080 record the decisions | The two files, `Proposed` |

## 8. Edge cases walked through

| Case | Where it is handled |
|---|---|
| Empty: empty database, empty migrations folder | Smoke step 7: node-pg-migrate creates `pgmigrations` and logs "No migrations to run!" |
| Repeated: migrate twice | Smoke steps 6–7: same schema dump, same row count |
| Concurrent: two migrate runs at once | Smoke step 6: the second exits non-zero and changes nothing; ADR 0080 asks FND-07b to keep releases in sequence |
| Error: missing or malformed variable | `env.test.ts`, `migrate.test.ts`: fail at once, name the variable, never print the value |
| Error: unreachable database | `migrate.test.ts`; smoke step 4 |
| Error: a migration fails halfway | Smoke step 5: one transaction, so neither table remains |
| Slow: Postgres not ready | Compose healthcheck on TCP (`pg_isready -h 127.0.0.1`, so the image's init-time socket-only server doesn't count) and `--wait`. `migrate` itself doesn't retry: it fails within 10 s, and the platform's release retries |
| Slow: the API not ready | `--wait --wait-timeout 30` against the container's healthcheck: a deadline, not a sleep |
| Signals: Node as PID 1; SIGINT on Fly | `server.test.ts`; smoke step 9; `ENTRYPOINT` in exec form, so no shell or pnpm sits between |
| Time zones: distro Node, `TZ`, `NODE_ICU_DATA` | The image carries pnpm's nodejs.org binary (full ICU 78.3, tz 2026e), and the smoke asserts that neither variable is set. Debian's own `tzdata` package is 2026f but `Intl` doesn't read it |
| Duplicate and retry, offline, DST beyond the four dates, largest text, screen reader, Reduce Motion | Not applicable: no write path, no user interface, and DST rules are `game-rules`' tests (ENG-03) |

## 9. Roadmap §7 guardrails that apply

- **Contracts first:** D1, recorded in ADR 0079.
- **An ADR in the same pull request:** 0079 and 0080.
- **Expand, migrate, contract with concurrent indexes:** D4, proven by smoke step 6.
- **The application's role can't alter the schema:** a separate `MIGRATION_DATABASE_URL` now; the roles come in BE-02.
- **Secrets only in platform stores:** none exist.
- **Health checks and no-downtime deploys:** the probe and the clean stop are this ticket's half.
- **Nothing cached at the CDN that shouldn't be:** `no-store`.
- **Test-first and `pnpm verify` green; one ticket per pull request citing §21.2 and SEC-01.**
- No user interface, so no simulator pass.

## 10. Notes for neighbouring tickets

- **BE-01:** build on `createApp`. Mount routes from `endpointList` beside `/health`, and keep `/health` outside the problem handler and the access middleware (D1). `server.ts` already handles the clean stop.
- **BE-02:**
  - Add `DATABASE_URL` for the application's role and give `MIGRATION_DATABASE_URL` the migration role.
  - Write schema migrations as `.sql`, and concurrent-index migrations as `.ts` with `pgm.noTransaction()`.
  - Replace the root `include` line with the API's own Vitest project.
  - pg-boss's schema can be a migration too.
- **BE-06:** the image's zone data is Node's (tz 2026e today), and only a Node bump changes it; see the proposed ticket below.
- **FND-07b:**
  - `release_command = "migrate"` (ENTRYPOINT stays) on Neon's direct string with `sslmode=verify-full`.
  - `[[http_service.checks]]` on `/health`, with `kill_timeout` of at least 5 s.
  - `GIT_COMMIT` passed as a build argument; registry push and a build cache.

## 11. Proposed tickets (outside this scope)

1. **Keep Node, base images and actions current** (BE or FS, S). Nothing bumps them today. Add Renovate or Dependabot for `devEngines.runtime`, Dockerfile digests and action SHAs, with a rule that a Node bump runs `api-smoke`. Zone data drifts already: Debian ships tzdata 2026f, while Node 26.13.1 carries 2026e (ADR 0005, BE-06).
2. **Make `api-smoke` a required check** (PM and owner, S), per D6, once it is green on `main`.
