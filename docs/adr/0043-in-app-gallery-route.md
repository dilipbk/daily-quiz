# 0043. An in-app gallery route, not Storybook

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §12.9, §18.2, §21.1; roadmap §3.1 (Component workbench), §3.3 A5, §7 |

## Context

The spec used Storybook for React Native to show every component in every state, theme and text size. The roadmap records, on 2026-11-14, that Storybook's on-device UI is broken on current React Native; the evidence wasn't kept. The earlier prototype's workbench never rendered on a device (roadmap §9).

## Decision

A development-only route in the app renders every design-system component in every state, in light, dark and high contrast, at the default and the largest text size. This replaces Storybook (amendment A5).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Storybook for React Native | Recorded as broken on device, and the prototype's never rendered. |
| Storybook on the web only | It would show web renderings, not the native controls, fonts and glass that the device checks are about. |
| No workbench | Error, offline and empty states are hard to reach inside real screens. |

## Consequences

- FE-02 builds the route. A component is done when its gallery entry shows every state.
- Design review compares the gallery with the design canvas, on a simulator and an emulator.
- The matrix is code we own; there are no Storybook add-ons.
- The route is left out of production builds. Revisit at V1.
