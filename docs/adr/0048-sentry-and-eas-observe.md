# 0048. Sentry for crashes, EAS Observe for startup and navigation timing

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §15.2, §18.2, §21.2; roadmap §3.1 (Crashes and performance), G3 |

## Context

The spec said "Sentry or EAS Observe". Launch is gated on crash-free sessions of at least 99.5% and on the startup budgets of spec §15.2. The roadmap notes that Observe doesn't replace Sentry yet.

## Decision

Sentry reports crashes and errors from the app. EAS Observe measures startup and navigation timing in the field.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Sentry alone | Kept as the fallback. If Observe can't be installed, Sentry's performance tracing takes its place, by a new ADR. |
| EAS Observe alone | It doesn't replace Sentry yet (roadmap §3.1). |
| Firebase Crashlytics | Native Google SDKs, and app errors would sit apart from the API's, which go to Sentry (ADR 0066). |

## Consequences

- The Sentry baseline is Expo's pin, 8.28.0, with upload disabled. Sentry's fixes for React Native 0.88 are in 8.30 to 8.35, so the pin is re-checked when the DSN is switched on in FND-05b (ADR 0006).
- `expo-observe` is not installed: on Android it throws at start-up without an EAS project id. FND-05b restores it (ADR 0009).
- Neither service receives personal data (PRIV-08).
- The crash-free figure for G3 is read from Sentry.
