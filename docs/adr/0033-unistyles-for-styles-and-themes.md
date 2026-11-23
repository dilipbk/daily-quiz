# 0033. Unistyles 3 on Nitro Modules for styles and themes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §12, §18.2, A11Y-12; roadmap §3.1 (Styling and themes), §3.2 |

## Context

The app has three themes (light, dark and high contrast), generated from `packages/design-tokens`. Changing theme must not re-render the tree (spec §18.2). Unistyles 3 updates styles from C++ without a render. Version 3.8.1 needs React Native 0.85 or later and the New Architecture, is built against Nitro Modules 0.37.1, and its docs say to pin that Nitro version exactly. FND-05 built and ran it (ADR 0006).

## Decision

The app styles with Unistyles 3.8. Its themes come from `packages/design-tokens`, and `react-native-nitro-modules` is pinned to 0.37.1 exactly.

## Alternatives considered

| Alternative | Why not |
|---|---|
| NativeWind | Its Tailwind 4 version isn't stable (roadmap §3.2, 2026-11-14). |
| Plain `StyleSheet` with a theme context | Every themed component re-renders when the theme changes. |

## Consequences

- Colours, spacing, radii and font sizes come from tokens, and lint rejects raw values (roadmap §7).
- The Nitro pin is shared with MMKV (ADR 0040) and rules out Rive, whose Nitro range stops below 0.37. The mascot stays static until that clears (roadmap §3.2).
- Setup, from FND-05's research: a custom entry file with Expo Router; a Babel plugin that needs `root` and is announced for removal in 4.0; `useServerUnistyles` for server output.
- Found by FND-05: themed styles update natively only on React Native's own views, and a style that depends on `fontScale` didn't refresh on iOS until restart. Check both after any change to theme or text-size handling.
- Revisit at Unistyles 4, and when Rive supports this Nitro version (V1).
