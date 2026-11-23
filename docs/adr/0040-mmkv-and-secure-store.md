# 0040. MMKV for local data, SecureStore for secrets, SQLite deferred to V1

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §16, §18.2, SEC-02, OFF-03; roadmap §3.1 (Storage), §4.3 |

## Context

The device keeps the query cache, the session snapshot, settings, the outbox of completions waiting to sync, the session token and the guest's device secret. A completion is written to the outbox before its first send (roadmap §4.3), so that write has to be fast and synchronous. MMKV 4.3.2 is built on Nitro 0.35.9; FND-05 showed it links and runs against the pinned Nitro 0.37.1 (ADR 0006).

## Decision

MMKV 4.3 holds key-value data, the query cache and the outbox, with one key per outbox entry. `expo-secure-store` holds the session token and the device secret. SQLite isn't installed until V1's offline packs need it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| AsyncStorage | Every read is asynchronous, so the first frame either waits for it or renders without the player's settings. |
| SQLite now | Nothing in the MVP needs a query. The spec schedules it for V1 with offline packs. |
| The outbox as one array under one key | Every append rewrites the whole list, and a write cut short could lose every pending completion. |

## Consequences

- Tokens and the device secret never go in MMKV.
- MMKV 4's API is `createMMKV()` and `.remove()`. Its value hooks throw during static or server web rendering, so web pages don't read MMKV while rendering.
- MMKV and Unistyles share the Nitro pin (ADR 0033); re-test both when it moves.
- Sign-out and account deletion clear both stores.
