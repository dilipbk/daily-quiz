# 0055. pg-boss for jobs and schedules, in the same database

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Roadmap §3.1 (Jobs and schedules), §3.2, §4.3, §7 |

## Context

Completing a session must enqueue its follow-up jobs atomically: if the completion commits, the jobs exist, and if it rolls back, they don't (roadmap §4.3). The system also runs schedules, such as building the daily and sending pushes.

## Decision

Jobs and schedules run on pg-boss 12, with its tables in the application's Postgres. A job is enqueued inside the business transaction that causes it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| BullMQ | It needs Redis, and a job in Redis can't join a Postgres transaction (roadmap §3.2). |
| Inngest or Trigger.dev | A hosted service adds cost and a second place where state lives (roadmap §3.2). |
| Kafka or RabbitMQ | Premature (spec Appendix B). |
| Host cron with tables of our own | We would rebuild retries, backoff and deduplication. |

## Consequences

- Jobs can run more than once, so every job handler is idempotent.
- Job tables share the database's capacity. The worker batches question statistics (roadmap §4.3), and queue depth is monitored (ADR 0066).
- pg-boss needs a schema of its own. The application's role can't alter the schema (roadmap §7), so BE-02 has the migration role create it.
- Revisit with live events in V2 (ADR 0056).
