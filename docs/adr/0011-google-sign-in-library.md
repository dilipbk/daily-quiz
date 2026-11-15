# 0011. Google sign-in uses `@react-native-google-signin/google-signin` for now

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `FND-05` |
| **Requirements** | ONB-04 (Google sign-in), roadmap §3.1 ("Better Auth Expo client, `expo-apple-authentication`, Google sign-in") |

## Context

The roadmap plans native Google sign-in without naming a library. Checked on 2026-11-15:

- Better Auth's Expo guide signs in with a Google ID token obtained from `@react-native-google-signin/google-signin`.
- Expo's Google authentication guide now lists `react-native-nitro-google-signin` first and this library second.
- Neither library states support for React Native 0.88.

FND-05 has to build one of them to prove the native side links.

## Decision

The shell builds `@react-native-google-signin/google-signin` 17.0.0 (the free version), pinned exactly, because it is the path Better Auth documents. BE-03, which does the first real Better Auth and Expo integration, confirms or replaces it.

Its config plugin throws during prebuild unless it is given an `iosUrlScheme` that starts with `com.googleusercontent.apps.`, so `app.config.ts` passes the placeholder `com.googleusercontent.apps.placeholder`. The real scheme comes from the Google project FND-04 creates.

## Alternatives considered

| Alternative | Why not |
|---|---|
| `react-native-nitro-google-signin` | Newer and Nitro-based, so it would share the Nitro version Unistyles pins (ADR 0006). No Better Auth guide uses it yet; BE-03 can weigh it with a working backend to test against. |
| A browser flow through `expo-auth-session` or Better Auth's social redirect | No native library to prove, but a worse sign-in: it leaves the app, and the spec's two-minute first session (§5) has no room for it. |
| Leave Google sign-in out of the smoke build | Its native code is exactly the kind FND-05 exists to prove early. |

## Consequences

- Proven on React Native 0.88.1: the library builds on iOS and Android, debug and Android release, and its native module answers a call (`hasPreviousSignIn()` returned `false`) with no Google project configured. No `google-services.json` is needed.
- Sign-in itself is untested: it needs client ids (FND-04) and the backend (BE-03).
- The placeholder URL scheme must be replaced before any build that is meant to sign in. A build that still has it will fail at sign-in, not at build time.
- If BE-03 moves to the Nitro library, it supersedes this ADR and re-runs the smoke screen.
