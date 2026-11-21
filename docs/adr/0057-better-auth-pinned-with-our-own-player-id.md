# 0057. Better Auth, pinned exactly, with all game data keyed to our own player_id

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec Q7, §19.1, ONB-02, ONB-04, ONB-05, SEC-02; roadmap §3.1 (Auth), §4.3 |

## Context

Spec §19.1 names Better Auth "or an equivalent" that supports guests and account linking, and Q7 left the final choice open. Most players never sign in, so the guest account is the account (roadmap §4.3).

## Decision

Auth is Better Auth 1.7, pinned to an exact version, with its anonymous (guest) plugin, account linking, Apple, Google and magic link. All game data is keyed to our own `player_id`, never to the auth library's user id. This answers spec Q7.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A hosted identity service | It puts identity, every guest included, in a vendor's system. That goes against roadmap §2 rule 6 and makes it harder to merge and delete an account in one transaction with its game data. |
| Auth written from scratch | Sessions, OAuth and magic links are security-critical code we would write and maintain. |

## Consequences

- The exact pin makes an auth upgrade a deliberate act, done in an upgrade window with BE-03's integration test re-run. The app's client is pinned to the same version (ADR 0045).
- `player_id` sits between the library and the game tables. Linking merges into the same `player_id` in one transaction, and replacing the library wouldn't touch a game table.
- Personal data stays in the identity and device tables (roadmap §7).
- The session model is ADR 0073.
