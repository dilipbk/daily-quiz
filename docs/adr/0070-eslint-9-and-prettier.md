# 0070. ESLint 9 and Prettier

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §18.6; roadmap §3.1 (Lint and format), §7 |

## Context

Lint carries real rules here: import boundaries, the purity of the engine, no literal strings and no raw style values (roadmap §7). The roadmap records, on 2026-11-14, that `eslint-config-expo` doesn't support ESLint 10 yet; the evidence wasn't kept. FND-01 installed ESLint 9.39.5, typescript-eslint 8.72.2 and Prettier 3.10.

## Decision

The workspace lints with ESLint 9 in flat config with typescript-eslint and formats with Prettier, both shared from `packages/config`. `pnpm verify` runs both and allows no warnings.

## Alternatives considered

| Alternative | Why not |
|---|---|
| ESLint 10 | `eslint-config-expo` doesn't support it yet. |
| Biome, which spec §18.6 names | No reason was recorded. The rules roadmap §7 relies on are ESLint rules and plugins today, starting with Expo's own config. |

## Consequences

- `docs/` and `CLAUDE.md` are outside the format check: prose is reviewed by people.
- typescript-eslint 8.72 supports TypeScript below 6.1, which is one reason the workspace stays on TypeScript 6.0 (ADR 0030).
- `tseslint.config()` is deprecated in favour of `defineConfig`.
- Move to ESLint 10 when `eslint-config-expo` supports it.
