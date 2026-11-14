# Daily quiz

A daily-habit quiz app: an Expo mobile app (iOS, Android and web share pages), a Hono API and an admin console, in one pnpm monorepo.

The product is described in [`docs/spec.md`](docs/spec.md) and the delivery plan in [`docs/roadmap.md`](docs/roadmap.md). How the team works, ticket by ticket, is in [`CLAUDE.md`](CLAUDE.md).

## Getting started

You need git and [pnpm 11](https://pnpm.io/installation). Nothing else: pnpm downloads the workspace's Node version (26.13.1) on the first install and runs every script with it.

```bash
pnpm install
pnpm verify
```

If your pnpm is a different version, it switches itself to the one pinned in `package.json`. `pnpm verify` should finish green in a few seconds. It is the same command CI runs, and it must pass before you report a ticket as done.

Use `pnpm`, `pnpm exec` and `pnpm dlx` at the repository root. `npm` and `npx` refuse to run there unless your own Node is exactly the pinned version.

## Commands

| Command          | What it does                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| `pnpm verify`    | Typecheck, lint, format check and tests, in that order. Stops at the first failure. |
| `pnpm typecheck` | `tsc --noEmit` in every workspace package                                           |
| `pnpm lint`      | ESLint over the whole repository; warnings fail                                     |
| `pnpm format`    | Rewrite files with Prettier (`pnpm format:check` only reports)                      |
| `pnpm test`      | Every package's tests, once (`pnpm exec vitest` watches)                            |

## Layout

```
apps/
  mobile/            Expo app: iOS, Android, web share and marketing pages   (FND-05)
  api/               Hono API and worker                                     (FND-07)
  admin/             React Admin console                                     (CMS-01)
packages/
  contracts/         zod schemas, endpoint registry, error codes, fixtures, fake server
  quiz-engine/       question-type schemas, graders, normalization, scoring
  game-rules/        streak and day-boundary logic, XP, levels, badge rules
  content-blocks/    block schema and validation
  content-tools/     content:validate, import, drafting helpers
  design-tokens/     tokens as data: Unistyles themes, CSS variables
  config/            tsconfig, ESLint and Prettier presets
content/             question drafts and daily sets, as files until the CMS owns them
docs/                spec.md, roadmap.md, traceability.md, adr/, plans/, design/
```

The `apps/` folders arrive with the tickets shown. Apps depend on packages; packages never depend on apps.

## Conventions

**Packages are source-only.** Each one is a private ES module named `@repo/<folder>` that exports `./src/index.ts` directly. There is no build step: the app's bundler, the API and the test runner compile the source they import. To use one, add `"@repo/<name>": "workspace:*"` to your dependencies.

**Shared code stays portable.** Packages extend `@repo/config/tsconfig/base.json`, which loads no Node or DOM types, so code shared by the app and the server can't reach for a platform API by accident. A package that runs only on Node adds `"types": ["node"]` in its own `tsconfig.json`.

**Tools live at the root.** TypeScript, ESLint, Prettier and Vitest are installed once, in the root `package.json`. A package lists only what its own code imports.

**Dependencies are installed cautiously.** pnpm 11 won't install a version published less than a day ago, and it stops the install when a dependency wants to run a build script nobody has approved. Approve one by adding it to `allowBuilds` in `pnpm-workspace.yaml`, after checking what the script does.

**Tests sit beside the code.** Name a file `*.test.ts` under a package's `src/` or `tests/` and `pnpm test` picks it up. Import `describe`, `it` and `expect` from `vitest`.

**A new package** needs a `package.json`, a `tsconfig.json` and `src/index.ts`: copy them from `packages/content-blocks`. `packages/config/tests/workspace.test.ts` checks the rules above for every folder in `packages/`. A new package changes a package boundary, so it also needs an ADR.

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org/) and cite the ticket, for example `feat(quiz-engine): grade ordering questions (ENG-02)`. A git hook checks the format when you commit. Branches are named `<type>/<ticket-id>-<slug>`: one ticket, one branch, one pull request.

**Decisions** that choose a library, change a package boundary or depart from the spec get an ADR in the same pull request. See [`docs/adr/README.md`](docs/adr/README.md).

**Secrets** never enter the repository. `.env` files are ignored by git; real values live in each platform's secret store (roadmap §7).
