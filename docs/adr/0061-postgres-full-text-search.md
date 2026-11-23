# 0061. Postgres full-text search with pg_trgm and unaccent

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | EXP-03, EXP-06; roadmap §3.1 (Search); BE-19 |

## Context

MVP search covers quizzes and topics: a few hundred documents at launch. It has to forgive a one-letter typo (BE-19) and ignore accents.

## Decision

Search is Postgres full-text search, with `pg_trgm` for typo tolerance and `unaccent` for accents. There is no separate search service.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A search engine such as Meilisearch, Typesense or Elasticsearch | A second data store to host, keep in sync and secure, for a few hundred documents. |
| A hosted search service | It costs money and keeps a copy of the catalogue with a vendor. |
| `LIKE` queries | No ranking and no typo tolerance. |

## Consequences

- Each search query ships with its index and an `EXPLAIN (ANALYZE, BUFFERS)` on seeded data (roadmap §7).
- A migration enables both extensions, and the provider must offer them (ADR 0053).
- Ranking is rule-based SQL at MVP (EXP-06).
- Launch is English only. V1 languages need a search configuration each; revisit then, and again with embeddings in V2.
