# 0066. Sentry, structured logs with a request id, and uptime and cron monitors

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Roadmap §3.1 (Observability), §7 (Availability and recovery) |

## Context

The soft-launch target is 99.9% monthly availability. Someone has to be told when the API is down or a scheduled job didn't run, and a player's report has to be traceable to one request.

## Decision

The API and the worker report errors to Sentry and write structured logs that carry a request id. An uptime monitor watches `/health`, and cron monitors watch the scheduled jobs.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A full tracing and metrics stack | More to run and pay for than one service of this size needs yet. |
| Logs alone | Nobody is told when something breaks. |

## Consequences

- The request id is returned with every error (ADR 0064), so support can find the request.
- Personal data is never written to logs (roadmap §7).
- A missed schedule raises an alert. The daily has to exist before the first local midnight on Earth.
- Sentry is shared with the app (ADR 0048): about $29 a month at list prices on 2026-11-14. Revisit before QA-09 if the load test needs metrics that logs can't give.
