# 0045. Better Auth's Expo client, with native Apple and Google sign-in

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | ONB-02, ONB-04, ONB-05, SEC-02; roadmap §3.1 (Auth, device), §4.3 |

## Context

The server runs Better Auth (ADR 0057). A guest is created at first launch with no screen; signing in with Apple, Google or a magic link is optional and comes later. `@better-auth/expo` 1.7.25 is JavaScript-only. Its guide targets Expo SDK 55, it is tested on SDK 56, and it makes no statement about SDK 58. Issue #10545 reports that `useSession` never updates after sign-in.

## Decision

The app uses the Better Auth Expo client for sessions, `expo-apple-authentication` for Sign in with Apple, and a native Google sign-in library, which ADR 0011 names. Tokens live in SecureStore (ADR 0040).

## Alternatives considered

| Alternative | Why not |
|---|---|
| A browser-based flow for both providers | It leaves the app to sign in (ADR 0011). |
| A hosted identity service's SDK | It moves identity to a vendor, against roadmap §2 rule 6 and ADR 0057. |
| Our own client for the auth endpoints | It rewrites what the library's client provides, and drifts from the server. |

## Consequences

- BE-03 runs the first real integration, before anything depends on it, and watches issue #10545.
- Sign in with Apple can't be built until the Apple Developer account exists (ADR 0010), and it always fails on a simulator, so it is proven in a device pass.
- The Google library's free version sits on Google's legacy Android SDK; BE-03 confirms or replaces it (ADR 0011).
- The app never keys anything to the auth library's user id. It uses `player_id` (ADR 0057).
