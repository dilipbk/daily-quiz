# 0046. expo-notifications with the Expo push service

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | NTF-01 to NTF-05; roadmap §3.1 (Notifications) |

## Context

The MVP sends a local streak reminder and a "your turn" push for challenges. Both platforms need permission prompts, channels and tokens.

## Decision

The app uses `expo-notifications` for permission, channels, local reminders and push tokens. The API sends through the Expo push service (BE-12).

## Alternatives considered

| Alternative | Why not |
|---|---|
| FCM and APNs called directly from the API | Two integrations, two sets of credentials and two receipt formats, where the Expo push service gives one endpoint. |
| A notification vendor's SDK | Another SDK in the app and another place where player data lives (PRIV-08). |

## Consequences

- Android push tokens need FCM credentials and iOS needs an APNs key (O-2, FND-04). The library builds without them, so local builds are unaffected.
- SDK 58 shows foreground notifications by default. FE-13 decides what a push does while a quiz is on screen.
- The sender handles batches, receipts and retries, and a revoked token stops receiving within a day (BE-12).
- The library can also return native device tokens, so leaving the Expo push service later is an API change plus a token migration.
