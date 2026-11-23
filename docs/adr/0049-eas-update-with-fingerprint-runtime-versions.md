# 0049. expo-updates and EAS Update, with fingerprint runtime versions

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §21.2; roadmap §3.1 (Updates); QA-02 |

## Context

A fix to JavaScript or an asset should reach players without a store review, and an update must never land on a binary whose native code it doesn't match.

## Decision

The app uses `expo-updates` with EAS Update. The runtime version policy is `fingerprint`, and the channels are `preview` and `production`. Updates carry JavaScript and assets only.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Store releases only | Days for each fix, and no rollback. |
| A runtime version string kept by hand | Someone forgets to raise it after a native change, and the update crashes older binaries. The fingerprint is computed. |
| An update server of our own | Nothing we need to run today. |

## Consequences

- A change to native code or config changes the fingerprint and needs a new build. SDK 58's default fingerprint preset is `balanced`.
- QA-02 rehearses a rollback before launch.
- `isEnabled` reads true inside a development build; don't use it to detect production (ADR 0006).
- An update never interrupts a quiz (FE-21). EAS Update itself is unproven until FND-05b.
