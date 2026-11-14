# 0002. Shared packages are tested with Vitest, from one root config

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-01` |
| **Requirements** | Spec §21.1 (unit tests), roadmap §3.1 (Tests rows), roadmap §7 ("Logic is written test-first") |

## Context

Spec §21.1 names Jest with fast-check for unit tests of graders, answer normalization, scoring and streak logic. It was written when the backend was a separate project. The roadmap has since moved that logic into shared packages (`quiz-engine`, `game-rules`, `content-blocks`, `contracts`) that both the app and the API import, and it gives each app its own runner: Jest 30 with `jest-expo` for `apps/mobile`, Vitest 5 for `apps/api`. It doesn't say which runner the shared packages use.

The packages are source-only TypeScript ES modules with no React Native dependency. Vitest 5 runs such files as they are. Jest 30 needs a TypeScript transform and its ES module support configured first.

## Decision

Tests in `packages/*` run on Vitest 5, from one root `vitest.config.js` that includes `packages/*/{src,tests}/**/*.test.ts`. fast-check stays the property-testing library the spec names.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Jest 30 for the packages, as spec §21.1 says | It adds a transform and ES module configuration for code that has nothing to do with React Native, and a second runner for the API's engineers to learn. |
| A `test` script in each package | A package whose script is missing or mistyped is skipped without a word. One root include can't leave a test file out. |
| A Vitest project per package | Worth it once packages need different environments or setup. Today they all run on plain Node. |

## Consequences

- One runner covers the shared logic and the API. `apps/mobile` keeps Jest for component tests, so `pnpm test` gains a second runner when FND-05 lands.
- Spec §21.1's unit-test row now reads "Vitest, fast-check" for shared packages. FND-06 should fold that into spec v1.1.
- `apps/api` needs its own Vitest project (real Postgres, longer timeouts). BE-02 adds it beside the root include.
- Revisit if a shared package ever needs React Native modules in its tests.
