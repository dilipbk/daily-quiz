# 0068. The admin console is a React Admin single-page app on the same API

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | ADM-01 to ADM-04; roadmap §3.1 (Admin console); CMS-01, CMS-02 |

## Context

A few staff use the console for the review queue, the question editor, the daily scheduler, moderation and remote config. Content review is the critical path to launch, and CMS-01 must let a reviewer handle a question in under a minute.

## Decision

`apps/admin` is a React Admin single-page app. It calls `/admin/*` routes on the same API through Hono's `hc` client and reuses the shared validators and graders. The player preview is the app's web build in a frame.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Admin screens inside the player app | Admin code would ship with the player's app. |
| A headless CMS | Our content model has its own validators, graders and versioning. They would be restated in the CMS's schema and become a second source of truth. |
| A low-code internal tool | It can't run the shared graders and validators, and it is another vendor with database access. |
| A React app written from scratch | We would rebuild lists, filters and forms. |

## Consequences

- CMS-01 starts on React Admin's stock layout; DS-08 supplies wireframes.
- Every admin route declares the admin access level, and every action is written to the audit log (roadmap §7).
- The console deploys with the API, so `hc`'s types always match (ADR 0041).
- Editor forms sit in a map keyed by the engine's `QuestionType` (ADR 0020).
