# 0079. The API image: Debian slim, the lockfile's Node, TypeScript run as source

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-23 |
| **Ticket** | `FND-07a` |
| **Requirements** | Spec §21.2 (Environments), SEC-01; roadmap §2 rule 6, §3.1 (Framework and runtime, CI/CD), §7 (Architecture, Availability); ADR 0001, 0005, 0051 |

## Context

ADR 0051 puts the API and the worker in one container image, and ADR 0001 says the image runs the workspace's Node, 26.13.1, written once in `package.json` (`devEngines.runtime`). Streak dates come from that Node's own ICU and zone data (ADR 0005). Every workspace package exports its TypeScript source (`exports: ./src/index.ts`) and has no build step.

Checked on 2026-11-23, on Node 26.13.1, pnpm 11.28.9 and Docker 28.0.4:

- Node 26 strips TypeScript types by default ("Stability: 2 - Stable"). It refuses files whose real path is under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). A pnpm workspace package reached through its symlink in `node_modules` runs, because its real path is in `packages/`. The output of `pnpm deploy` (with or without `--legacy`) puts the packages' files under `node_modules` and fails, and so does running with `--preserve-symlinks`.
- pnpm provisions Node from the URL in `pnpm-lock.yaml` and checks the sha256 recorded there, even when the Node already running has the same version.
- Node 26's official Linux binary links `libatomic.so.1` on arm64 and x64. `debian:trixie-slim` lacks it; the official `node` images include it.
- Fly.io, the host after FND-04 (ADR 0052), sends SIGINT by default (`kill_signal`) and kills after 5 s (`kill_timeout`). Its `release_command` replaces the image's CMD and keeps its ENTRYPOINT.

## Decision

1. **Base and Node.** The runtime stage is `debian:trixie-slim`, pinned by digest, plus `libatomic1`. Node is the binary pnpm provisions from the lockfile, copied in from a build stage, so the version stays written only in `package.json`. Build stages run pnpm on `node:26-trixie-slim`, pinned by digest; that image's own Node is never shipped. The runtime carries no npm, pnpm or corepack, and sets neither `TZ` nor `NODE_ICU_DATA`.
2. **TypeScript runs as source.** The image holds a filtered production install (`pnpm install --prod --filter-prod "@repo/api..."`) in pnpm's workspace layout. Node strips the types at load time, and there is no bundler. Three rules keep this working; break any one and Node refuses the workspace packages:
   - never build the image with `pnpm deploy`;
   - never set `injectWorkspacePackages`;
   - never run Node with `--preserve-symlinks`.
   The smoke step "Node, ICU and time-zone data inside the image equal the workspace pin" imports `@repo/game-rules` inside the image on every pull request, so a break fails CI, not production.
3. **Commands.** `ENTRYPOINT ["node", "apps/api/src/main.ts"]` with `CMD ["api"]`. `docker run <image> migrate` runs the migrations (ADR 0080). `worker` is added beside them by the first job ticket. Node is PID 1 with no shell or package manager in front. It runs as uid and gid 10001 (`api`), over files owned by root that it can't change.
4. **Stopping.** On SIGTERM or SIGINT the API stops accepting connections, closes idle keep-alive connections, lets requests in flight finish (closing each connection as its response ends) and exits 0. After 4 s it closes what is left and exits 1.
5. **`/health`** answers `200 {"status":"ok","commit":"<sha>"}` with `Cache-Control: no-store`. It is liveness only: no database call, so a database blip can't take every machine out of rotation at once. `commit` comes from the `GIT_COMMIT` build argument, and is `unknown` without one.
   - **An exception to the contracts-first rule.** `/health` is an operations probe for the platform and the smoke script, outside the `packages/contracts` registry and the OpenAPI document, with no access level. This is an exception to roadmap §7's rule that an endpoint exists in `packages/contracts` first. It covers operations probes only and is not a precedent for product routes. BE-01 keeps `/health` outside its problem handler and its access middleware.
6. **Settings** come from the environment: `PORT` (3000 by default), `GIT_COMMIT`, and `MIGRATION_DATABASE_URL` for `migrate`. A bad value stops the process with a message that names the variable and never prints the value.

## Alternatives considered

| Alternative | Why not |
|---|---|
| The official `node:26.13.1-trixie-slim` image as the runtime | Simpler, but the version is written a second time (its tag and digest) and must be kept in step with `package.json` by hand; the runtime would also carry npm. |
| Bundling with esbuild or tsdown | A smaller image, but a second tool and ADR, source maps for Sentry, and a second way to run the same code. Stripped source keeps its line numbers, so stack traces need no maps. |
| `pnpm deploy` for a self-contained folder | It puts the workspace packages under `node_modules`, where Node won't strip types. |
| Alpine | Node's arm64 Alpine build is compiled from source and "not tested before release" (docker-node README); musl differs from what Node's binaries are tested on. |
| Distroless | It drops the shell, so `fly ssh console` can't help while the service is young. Worth revisiting once logs and Sentry are in place. |
| `/health` in `packages/contracts` | It changes a shared package for an endpoint no client calls, and every generator and fake server would have to skip it. |
| `/health` that queries Postgres | One slow database would fail every machine's check at the same moment. A readiness check can be added at its own path if FND-07b needs one. |

## Consequences

- To move Node, change `devEngines.runtime.version` and run `pnpm install`; the image follows the lockfile. The smoke fails if the image's Node, ICU or zone data differ from the workspace's.
- The image's zone data changes only when Node does (tz 2026e in Node 26.13.1, while Debian already ships 2026f). Keeping Node current is BE-06's concern (ADR 0005).
- The image carries every workspace package's source (about 1 MB) and pnpm's store layout; 308 MB on arm64, of which Node is 144 MB.
- Startup includes type stripping. The container was healthy about 1.7 s after `docker compose up` in the smoke.
- **FND-07b will probably change:**
  - pushing the image to a registry, with its tags;
  - passing `GIT_COMMIT` from the deploy;
  - a build cache (`docker/setup-buildx-action` with `type=gha`);
  - `kill_signal` and a `kill_timeout` of at least 5 s in `fly.toml`;
  - building for amd64 only;
  - `[[http_service.checks]]` on `/health`.
- Revisit if Node changes its rule on `node_modules`, if the image grows past what a deploy tolerates, or if a workspace package needs a build step.
