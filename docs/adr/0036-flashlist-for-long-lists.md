# 0036. FlashList 2 for long lists, with Legend List as the fallback

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §15.2, §18.2, EXP-01 to EXP-05; roadmap §3.1 (Lists) |

## Context

Explore, search results and review are long lists that must hold their frame rate on the low-end Android device (spec §15.2; FE-14). Spec §18.2 names FlashList v2 or Legend List v3. FlashList 2.3.2 is the version Expo pins for SDK 58. It is JavaScript-only and needs the New Architecture; its maintainers make no statement about React Native 0.88, and issue #2540 reports a type error from 0.87 on.

## Decision

Long or unbounded lists use FlashList 2.3. Legend List 3 is the fallback and is not installed.

## Alternatives considered

| Alternative | Why not |
|---|---|
| React Native's `FlatList` | It mounts and unmounts rows where FlashList recycles them, which costs frames on a low-end device. It stays fine for short, fixed lists. |
| Legend List 3 first | FlashList is the one Expo pins and tests with the SDK, and the baseline takes Expo's pins first (ADR 0006). |

## Consequences

- List performance is measured on the emulator and confirmed in the device pass (FE-14, QA-06).
- `@expo/ui`'s `List` is a settings-style list, not a virtualized one; data lists use FlashList.
- If FlashList fails on React Native 0.88 in a way a patch release doesn't fix, switch to Legend List with a new ADR.
