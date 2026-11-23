# 0012. Gesture Handler stays on Expo's pin (3.3)

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `FND-05` |
| **Requirements** | Roadmap §3.1 ("Gesture Handler at the SDK's pin") |

## Context

Expo SDK 58.0.25 pins `react-native-gesture-handler` to `~3.3.0`. Software Mansion's compatibility table lists 3.3 for React Native 0.83 to 0.87 and marks 0.88 as supported only from 3.4; npm's latest is 3.5.0. The 3.4.0 notes also fix an error on mount ("Tried to access a non-existent registry", issue 4523) that could affect 3.3.

So the two sources we normally trust disagree, and the roadmap says to follow the SDK's pin.

## Decision

Keep Expo's pin, `~3.3.0`, which resolves to 3.3.0.

It was built and run on React Native 0.88.1 in the FND-05 shell: iOS and Android, debug and Android release, and web. A `GestureDetector` with a pan gesture from the new hook API (`usePanGesture`) mounts inside `GestureHandlerRootView` and drives a Reanimated shared value. The error from issue 4523 did not appear.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Move to 3.5.0 now, with `expo.install.exclude` | Nothing failed on 3.3.0. Leaving Expo's pin makes `expo install --check` and `expo-doctor` warn on every run and takes us off the combination Expo tests. |

## Consequences

- The smoke check exercises one pan gesture. Gesture-heavy work (the session screen, FE-08 onward) is the first real test; if a 3.3-only bug shows up there, the fix is 3.5.x with `expo.install.exclude`, recorded in a new ADR.
- When Expo raises its pin in an SDK 58 patch, take it through `expo install --fix`.
- Code is written against the 3.x hook API (`usePanGesture`, `onActivate`, `onDeactivate`), not the 2.x builder API.
