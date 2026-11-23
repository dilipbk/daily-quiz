# 0073. Revocable server-side sessions and a device-held secret, not access and refresh tokens

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | SEC-02, spec §19.2, ONB-02; roadmap §3.3 A3, §4.3 (Guest identity), §9 |

## Context

SEC-02 and spec §19.2 describe short-lived access tokens with rotating refresh tokens. Better Auth (ADR 0057) keeps sessions on the server and can revoke them. Most players are guests, with no email address or provider to recover an account with. If a guest's session ends and nothing can start another, the streak is orphaned (roadmap §9).

## Decision

The app holds a revocable server-side session, kept in SecureStore. A separate secret, held on the device and also in SecureStore, can mint a new session for the same guest at any time. This replaces the token scheme of SEC-02 and spec §19.2 (amendment A3).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Access tokens with rotating refresh tokens, as the spec says | It isn't how Better Auth works, so we would write token issuance beside the library. A guest whose refresh token expired would have no way back. |
| A long-lived session and no device secret | Any expiry or revocation orphans the guest. |
| Sessions that never expire | A stolen token could never be shut out safely. |

## Consequences

- The server can end any session at once.
- The device secret is as powerful as the account. It lives only in SecureStore, never appears in logs or analytics, and the endpoint that accepts it is rate-limited. BE-03 decides how it rotates and what linking does to it.
- A guest who loses the device loses the account unless it was linked. That is what the save-progress prompts are for (ONB-03).
- BE-03 carries the test: an expired session, a new one from the device secret, the same `player_id`. QA-08 reviews the scheme, and FND-06 rewrites SEC-02.
