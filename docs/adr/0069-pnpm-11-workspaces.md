# 0069. One pnpm 11 workspace

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §18.3; roadmap §3.1 (Monorepo), §4.2 |

## Context

The app, the API, the admin console and the packages they share live in one repository, because grading, game rules and contracts must be the same code on the device and on the server. The EAS build images for SDK 58 ship pnpm 11 (checked 2026-11-14). pnpm 12 has been out since 2026-08-26.

## Decision

The repository is a pnpm 11 workspace, pinned to 11.28.9 in `packageManager`. pnpm 11 needs Node 22.13 or later; ADR 0001 fixes the workspace to one Node version.

## Alternatives considered

| Alternative | Why not |
|---|---|
| pnpm 12 | The EAS build images ship pnpm 11, and a build should install with the major the lockfile was written by. |
| A repository per app | The shared packages would need publishing and versioning, and one pull request couldn't change a contract and both of its sides. |
| npm or Yarn workspaces | pnpm's isolated installs catch a package that uses a dependency it never declared. |
| A build orchestrator on top | Not needed at this size: `pnpm verify` is one script and takes under a minute on CI. |

## Consequences

- pnpm 11 reads its settings only from `pnpm-workspace.yaml`. `strictDepBuilds` is on, so each dependency's build script is allowed or refused there by name.
- A one-day `minimumReleaseAge` applies: a version published today can't be installed until tomorrow.
- `eas.json` must set Node 26.13.1, because EAS images default to Node 22 (ADR 0001).
- Move to pnpm 12 when the EAS images ship it.
