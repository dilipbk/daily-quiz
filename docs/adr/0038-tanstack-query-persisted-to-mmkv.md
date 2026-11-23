# 0038. TanStack Query 5 for server state, persisted to MMKV

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §16, §18.5, OFF-06, OFF-07; roadmap §3.1 (Server state) |

## Context

Config, content and progress come from the server and must be cached, revalidated and readable at a cold start with no network (spec §16). Spec §18.5 keeps server state apart from session and interface state.

## Decision

Server state lives in TanStack Query 5. Its cache is persisted to MMKV through `@tanstack/query-async-storage-persister`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Fetch calls with results kept in a Zustand store | We would rebuild caching, deduplication, retries and invalidation. |
| The sync storage persister | It is deprecated (ADR 0006). |

## Consequences

- `gcTime` must be at least the persister's `maxAge` (24 hours by default), or restored entries are collected at once.
- The persisted cache holds per-player data, so sign-out and account deletion clear it (ONB-09).
- Completions don't travel through the query cache. They go to the outbox (ADR 0040, FE-07).
- Every response is validated before it is cached (ADR 0041).
