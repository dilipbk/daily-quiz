# 0031. Expo Router with NativeTabs, the native stack and form sheets

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D9, §8.1, §8.2, §8.3; roadmap §3.1 (Navigation) |

## Context

Spec §8 defines the tabs, the presentation rules and a file-based route map under `src/app`. Spec D9 asks for native chrome. SDK 58 exports NativeTabs as stable from `expo-router/native-tabs` (confirmed in expo-router 58.0.31). The web share pages use the same router (ADR 0067).

## Decision

Navigation is Expo Router: file-based routes, NativeTabs for the tab bar, the native stack for pushes and form sheets for sheets.

## Alternatives considered

| Alternative | Why not |
|---|---|
| React Navigation, configured by hand | Expo Router is built on it and adds file-based routes, typed links, deep links and web output. WB-01 needs all four, and we would rebuild them. |
| A tab bar drawn in JavaScript | D9 asks for the system's own chrome. A drawn bar imitates the system bar and falls behind it at each OS release. |

## Consequences

- NativeTabs limits, from FND-05's research: Android shows at most five tabs, tabs can't change at run time, Material icons need `expo-symbols`, and the web gets only a basic fallback.
- Router 58 gives no safe-area insets on the web; web layouts set their own padding.
- Route files stay thin and features don't import each other's internals (roadmap §4.2).
- Revisit if a tab ever has to appear or disappear while the app runs.
