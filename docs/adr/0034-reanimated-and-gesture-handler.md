# 0034. Reanimated 4 with Worklets, and Gesture Handler at Expo's pin

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §10.3, §12.5, §15.2; roadmap §3.1 (Animation and gestures), §7 ("Animation runs on the UI thread") |

## Context

Tap feedback has a 100 ms budget, and the timer must cause no React render per tick (spec §15.2, roadmap §7). Both need animation and gesture logic on the UI thread. Expo SDK 58 pins Reanimated 4.7.1, Worklets 0.13.0 and Gesture Handler ~3.3.0. Reanimated 4.7 supports React Native 0.86 to 0.88 and requires Worklets 0.13.

## Decision

Animation is Reanimated 4.7 on Worklets 0.13. Gestures are Gesture Handler at the version Expo pins.

## Alternatives considered

| Alternative | Why not |
|---|---|
| React Native's `Animated` | Its native driver covers transforms and opacity only, and it has no worklets for timer and gesture logic. |
| Gesture Handler 3.5, which its maintainers list for React Native 0.88 | 3.3.0 built and ran on every target, and overriding Expo's pin leaves a permanent `expo-doctor` warning (ADR 0012). |
| Worklets 0.13.1 | It adds only a Jest resolver fix that our tests don't need yet (ADR 0006). |

## Consequences

- `babel-preset-expo` adds the worklets plugin itself; don't add it by hand.
- Code uses Gesture Handler's 3.x hook API. Gestures on SVG children need `InterceptingGestureDetector`.
- Every animated component ships its Reduce Motion form (A11Y-04, spec §12.5).
- If a bug appears that only 3.3 has, the fallback is Gesture Handler 3.5.x with a new ADR (ADR 0012).
