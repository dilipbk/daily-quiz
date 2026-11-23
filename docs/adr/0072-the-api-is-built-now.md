# 0072. The API is built now, in this monorepo

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D5; roadmap §2 rules 3 and 4, §3.3 A2 |

## Context

Spec D5 made the backend a separate, later project and had the app built against contracts and mocks. That suited a solo developer. With a team, the larger risk is an app built on assumptions: streaks, XP and results are server-authoritative, so the daily loop can't be trusted until the server exists.

## Decision

The API is built from Phase 0, in this repository beside the app, contract first. This replaces the timing in spec D5 (amendment A2). D5's stack and its shared contracts package stand.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Keep D5: the app on mocks, the backend later | G2 asks for a real loop on a real API, on real devices, in week 6. |
| The API in a repository of its own | `quiz-engine`, `game-rules` and `contracts` must be the same code on both sides, and one pull request couldn't change both. |
| A backend-as-a-service in place of our API | The write path is custom logic: a re-grade with the shared engine, idempotency and ledgers in one transaction (roadmap §4.3). |

## Consequences

- An endpoint exists in `packages/contracts` before either side implements it (roadmap §7).
- API foundations with no player-facing screen run beside design in Phase 0. The owner approved that on 2026-11-14 (roadmap §2 rule 1).
- The fake server stays, for tests and offline development (ADR 0042), but G2 is measured against the real API.
- Running costs start in Phase 0. FND-06 folds this into the spec.
