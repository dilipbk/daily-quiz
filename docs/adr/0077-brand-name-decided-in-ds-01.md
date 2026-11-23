# 0077. The brand name and mascot are decided in DS-01, with a trademark check before any store upload

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec Q1; roadmap §3.3 A12, O-3; DS-01 |

## Context

Spec Q1 left the app's name, personality and mascot open. A bundle identifier is permanent once it has been uploaded to a store. Design is the first phase of the plan.

## Decision

DS-01 proposes three brand directions, each with name candidates, and the owner picks one. The name gets a first trademark and store search at that point, and the owner arranges a proper trademark check before any store upload. Until then, builds use a placeholder identifier that is never uploaded.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Fix the name before design starts | Name, mascot, palette and type are designed together. |
| Ship under a working name and rename later | The bundle identifier and the Android package can't change after an upload. |
| Skip the trademark check | A forced rename after launch costs the listing, the links and every share card already sent. |

## Consequences

- FND-05 builds with the placeholder `dev.dailyquiz.shell`. The real identifier is chosen in FND-05b, after the check.
- The domain, universal links and share pages (WB-01) wait for the name.
- O-3 is due in week 1, and the check before any upload.
