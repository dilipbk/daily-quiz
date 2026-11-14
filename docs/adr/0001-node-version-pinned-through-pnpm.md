# 0001. Node 26.13.1 for the whole workspace, provisioned by pnpm

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-01` |
| **Requirements** | Roadmap §3.1 (Monorepo row: "FND-01 fixes one Node version for the workspace"), spec §18.6 |

## Context

The workspace's tools and runtimes accept different Node versions, checked on 2026-11-14:

| Consumer | Node it accepts or ships |
|---|---|
| API runtime (roadmap §3.1) | Node 26 LTS |
| pnpm 11 | ≥ 22.13 |
| Expo SDK 58 (`expo` engines) | ^22.13, ^24.3 or ^26.0 |
| Vitest 5 | ^22.12, ^24 or ≥ 26 |
| EAS Build images for SDK 58, by default | 22.23.x, overridable per build profile with `node` in `eas.json` |

Current LTS releases are 26.13.1 (active), 24.22.3 and 22.23.5 (maintenance until April 2027). Team machines carry whatever Node their owner last installed.

pnpm 11 reads `devEngines.runtime` from the root `package.json`. With `onFail: "download"` it downloads that Node version, records it and its checksum in `pnpm-lock.yaml`, and runs every script with it. Its older settings for this (`useNodeVersion`, `executionEnv.nodeVersion`) were removed in pnpm 11.

## Decision

The workspace runs on Node 26.13.1, declared once in the root `package.json` under `devEngines.runtime` with `onFail: "download"`. pnpm provisions it for every script; CI reads the same field. pnpm itself is pinned to 11.28.9 in the `packageManager` field.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A `.nvmrc` or `.node-version` file with `engineStrict` | Each member must install the version by hand with a version manager of their own, and the file is a second place to keep in step with CI. |
| Node 22, to match the default EAS image | It leaves maintenance in April 2027, and tests would run on a different major from the API they cover. |
| Node 24 | Matches neither the API's runtime nor the default EAS image. |
| A version range such as `^26.13.1` | The lockfile would still fix one version, but CI's own Node and each member's could drift from it within the range. |

## Consequences

- A new member needs only git and pnpm. `pnpm exec node -v` prints `v26.13.1` whatever Node is on their PATH.
- `npm` and `npx` refuse to run at the repository root unless the caller's own Node is exactly 26.13.1 (`EBADDEVENGINES`). Use `pnpm exec` and `pnpm dlx` there. Inside a workspace folder with its own `package.json` they run as usual.
- FND-05 sets `"node": "26.13.1"` in every `eas.json` build profile so app builds use the same version, and confirms `npx expo install` works from `apps/mobile`.
- FND-07 builds the API image from the same Node version.
- Editors run their language servers on their own Node; any version from 22.13 works.
- To move to a new version, change the one line in `package.json`, run `pnpm install`, and commit the lockfile with it. Revisit when Node 26 leaves active LTS or Expo drops it.
