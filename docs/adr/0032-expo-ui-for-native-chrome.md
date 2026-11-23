# 0032. @expo/ui, expo-symbols and expo-glass-effect for native chrome

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D9, §12.1, §18.2; roadmap §3.1 (Native UI) |

## Context

Spec D9 is "brand in the content, native in the chrome": sheets, pickers, menus and switches should be the platform's own controls. `@expo/ui`, stable since SDK 56, renders SwiftUI on iOS and Jetpack Compose on Android. FND-05 resolved `@expo/ui` 58.0.28, `expo-symbols` 58.0.5 and `expo-glass-effect` 58.0.5.

## Decision

Chrome uses `@expo/ui` controls, system symbols through `expo-symbols`, and `expo-glass-effect` for glass surfaces. Branded content (questions, answers, celebrations) is our own components, styled from tokens (ADR 0033).

## Alternatives considered

| Alternative | Why not |
|---|---|
| A cross-platform component kit drawn in JavaScript | One look on both platforms is the opposite of D9, and each control is an imitation to keep up to date. |
| React Native's built-in controls plus a community library per sheet or picker | Several libraries, each with native code to keep working on React Native 0.88. `@expo/ui` ships and is tested with the SDK. |

## Consequences

- From FND-05's research: every `@expo/ui` tree needs a `Host`; `@expo/ui/swift-ui` is Apple-only, so a screen that uses it needs its Android counterpart; a symbol named by a plain string renders only on iOS.
- Glass exists on iOS 26 and later and is a plain view elsewhere, so nothing a player needs may depend on it.
- Where `@expo/ui` lacks a control, the fallback is React Native's own, recorded in the component's spec.
- Every component is built once in the design system and shown in the gallery (ADR 0043).
