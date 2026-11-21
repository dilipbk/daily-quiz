# 0030. Expo SDK 58 from the start, in development builds, with strict TypeScript

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D3, D4, §18.1, §18.2; roadmap §3.1 (Framework), §3.3 A1 |

## Context

Spec D3 puts iOS, Android and the web share pages in one Expo codebase. Spec D4, verified on 2026-09-27, said to start on SDK 57 and move to 58 once it was stable. SDK 58 has been stable since 2026-10-15. It makes NativeTabs a stable export and gives the Router its server output, and the plan uses both. The roadmap also notes that SDK 58 already meets Apple's April 2027 SDK rule.

FND-05 resolved expo 58.0.25, react-native 0.88.1, react 19.3.0 and typescript 6.0.3, and built and launched them on iOS, Android and web on 2026-11-15 (ADR 0006).

## Decision

The app starts on Expo SDK 58 (React Native 0.88, React 19.3). It runs in development builds, never in Expo Go, and compiles with TypeScript ~6.0 in strict mode. This replaces "start on SDK 57" in spec D4 and §18.1 (amendment A1).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Start on SDK 57 and upgrade later, as spec D4 says | 58 is stable. Starting on 57 would put an SDK upgrade in the middle of the build and leave NativeTabs under an `unstable-` import. |
| Expo Go | It can't load the native libraries the plan needs, such as MMKV and Unistyles (spec §18.2). |
| TypeScript 7 (7.0.2 on npm) | typescript-eslint 8.72.2 supports TypeScript below 6.1 (checked 2026-11-14). |
| React Native without Expo | We would own the native projects, the upgrade path, and the build and update services that EAS provides. |

## Consequences

- Expo-managed packages are installed with `npx expo install` and keep the SDK's pin. The versions FND-05 proved are the baseline (ADR 0006), and the native projects are generated, not committed (ADR 0007).
- SDK 58 sets the floor FND-05 built against: iOS 16.4, Android `minSdk` 24, Xcode 26.4 or later, JDK 17. That answers spec Q3 unless the owner raises the floor.
- Google Play refuses updates without 16 KB page support from 2027-02-01. The release APK passes the check (ADR 0006).
- Revisit in the upgrade window of each phase (roadmap §9): move to the next SDK when it is stable and every library in ADR 0006 supports it.
