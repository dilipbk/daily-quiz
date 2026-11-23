# 0056. Postgres and the CDN for caching and rate limits; no Redis at MVP

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §19.1; roadmap §3.1 (Cache and rate limits), §3.3 A6, §7 (Caching), §10 |

## Context

Spec §19.1 assumed Redis or Valkey for leagues and rate limits. At MVP, shared content is versioned and immutable, so the CDN can hold it; per-player responses are never shared; and a league cohort of 30 is an indexed query.

## Decision

The MVP runs no Redis. Shared content is cached at the CDN under immutable URLs. Per-player rate limits are counted in Postgres and per-IP limits at the edge (ADR 0060). Leagues stay in Postgres in V1. This replaces the Redis of spec §19.1 (amendment A6).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Redis or Valkey, as the spec assumed | A second stateful service to run, secure and pay for before anything needs it. |
| Counters in each machine's memory | With two machines a limit would be counted per machine, and lost at every deploy. |

## Consequences

- The per-player limiter writes to Postgres on the request path, so it must stay cheap. QA-09's load test measures it.
- Nothing is ever purged: content changes by publishing a new version (roadmap §7).
- Redis is reconsidered for live events in V2.
