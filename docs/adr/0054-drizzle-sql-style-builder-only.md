# 0054. Drizzle, using its SQL-style builder only

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Roadmap §3.1 (Data access), §7 (Data, queries and concurrency) |

## Context

Roadmap §7 asks for control a reviewer can see in the code: lock the player row first, write get-or-create as `INSERT … ON CONFLICT`, hold each endpoint to a query-count budget, paginate by cursor. Drizzle is at 0.45, and 1.0 is close (roadmap §9).

## Decision

Data access is Drizzle 0.45, through its SQL-style builder only. Its relational query API isn't used.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Drizzle's relational queries | They choose the joins for us, which makes a query-count budget harder to reason about. |
| An ORM that generates its queries | Joins, locks and `ON CONFLICT` become harder to state and to count. |
| Raw SQL strings | No types flow from the schema, so every row shape is declared by hand. |

## Consequences

- Joins, locks and transactions are written out, and BE-02's query-count helper asserts each endpoint's budget.
- Move to Drizzle 1.0 before the first production migration if it is stable by then (roadmap §3.1).
- The contract stays zod: `packages/contracts` never imports a Drizzle type.
