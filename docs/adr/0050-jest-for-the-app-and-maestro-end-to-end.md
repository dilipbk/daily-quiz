# 0050. Jest and Testing Library for the app, Maestro for end-to-end tests

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §21.1; roadmap §3.1 (Tests, mobile), §7 (Quality) |

## Context

App code needs React Native's transform and native-module mocks to run under test. The shared packages are plain TypeScript and run on Vitest (ADR 0002). End-to-end flows have to run against real builds.

## Decision

Tests in `apps/mobile` run on Jest 30 with the `jest-expo` 58 preset and React Native Testing Library 14.1. End-to-end flows are Maestro scripts run on EAS Workflows.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Vitest for the app as well | Expo maintains `jest-expo`, which sets up the transform and the mocks. Vitest has no preset maintained by Expo. |
| Detox for end-to-end tests | It compiles test code into the app. Maestro adds nothing to the app. |

## Consequences

- Two more packages are required: `@react-native/jest-preset`, because React Native removed its built-in preset, and `test-renderer`, because `react-test-renderer` doesn't support React 19.
- In Testing Library 14, `render`, `fireEvent` and `act` are async.
- Jest runs with `apps/mobile` as its working directory, and `pnpm verify` runs both runners.
- Maestro on EAS Workflows is unproven until QA-01.
