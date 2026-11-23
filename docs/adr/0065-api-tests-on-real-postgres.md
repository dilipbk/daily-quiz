# 0065. API tests run on Vitest against real Postgres

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §21.1; roadmap §3.1 (Tests, API), §7 (Data, queries and concurrency) |

## Context

The guardrails of roadmap §7 are about how the database behaves: locks, `ON CONFLICT`, unique keys, parallel duplicates, query counts. A mock can show none of these. The shared packages already run on Vitest (ADR 0002).

## Decision

API tests run on Vitest 5 against a real Postgres started by Testcontainers, with a helper that counts queries.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A mocked data layer | It proves that the code calls the mock. |
| An in-memory Postgres emulation | It isn't the engine production runs: locks, extensions and the planner differ. |
| One shared, long-lived test database | Tests interfere with each other and can't run in parallel on CI. |

## Consequences

- CI and every developer machine need Docker.
- `apps/api` gets its own Vitest project, added by BE-02 (ADR 0002). Vitest 5 needs Node 22.12 or later and defaults `clearMocks` to true.
- Every write path has a test that fires parallel duplicates, and every endpoint a query-count assertion (roadmap §7).
- These tests are slower than mocks. BE-02 decides how tests share a container without sharing data.
