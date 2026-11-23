# 0053. Postgres on Neon

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D5, §19.1, §19.5, Appendix B; roadmap §3.1 (Database), §3.2, §7 |

## Context

The data is relational (spec Appendix B). The write path depends on transactions, row locks and unique constraints. Roadmap §7 requires point-in-time recovery, and FND-07 gives every pull request its own database branch for migrations.

## Decision

The database is Postgres hosted on Neon, with point-in-time recovery and a branch per pull request. PlanetScale Postgres is the fallback if we outgrow it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Supabase | It charges far more for point-in-time recovery (roadmap §3.2). |
| Aurora | More operations than this team needs (roadmap §3.2). |
| Postgres we run ourselves | We would own backups, failover and upgrades. |
| MongoDB | The data is relational (spec Appendix B). |

## Consequences

- Application code uses plain Postgres and nothing only Neon offers, so the provider can change.
- The extensions the plan relies on (`pg_trgm`, `unaccent`) and pg-boss must work on Neon and on the fallback; BE-02 confirms it.
- Production also gets a weekly dump to R2, and a restore is rehearsed before launch (roadmap §7).
- About $19 a month at list prices on 2026-11-14.
