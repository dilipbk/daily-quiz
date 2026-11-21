# 0047. PostHog for analytics, feature flags and experiments

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §20, PRIV-04; roadmap §3.1 (Analytics and flags), §7 ("Every new feature sits behind a flag") |

## Context

The product needs analytics events (spec §20), feature flags with kill switches (roadmap §7) and experiments. `posthog-react-native` 4.86.0 is JavaScript-only.

## Decision

PostHog is the one service for product analytics, feature flags and experiments. The app calls it through a thin wrapper of our own.

## Alternatives considered

| Alternative | Why not |
|---|---|
| One tool for analytics and another for flags | Two SDKs, two vendors and two consent paths. |
| Firebase Analytics with Remote Config | Native Google SDKs on both platforms. |

## Consequences

- No event carries personal data, and with consent off nothing is sent (FE-21).
- Events and flags pass through our wrapper, so the vendor can be replaced.
- Analytics start after the first frame (roadmap §7). On the web the SDK needs `persistence: 'memory'` (ADR 0006).
- Open point: `GET /config` also carries flags (BE-01, ADM-04). FE-01's plan must say which source a kill switch reads, and a kill switch has to work with analytics consent off.
