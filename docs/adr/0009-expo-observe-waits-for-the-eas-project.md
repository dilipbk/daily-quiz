# 0009. `expo-observe` waits for the EAS project

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `FND-05` |
| **Requirements** | Roadmap §3.1 (crashes and performance: "EAS Observe for startup and navigation timing") |

## Context

Roadmap §3.1 plans EAS Observe beside Sentry. FND-05's local half builds every planned native library with no account, because FND-04 hasn't created the accounts yet.

`expo-observe` 58.0.19 can't be built into an app that has no EAS project id. On Android its module constructs `ObservabilityManager` at start-up, which requires `extra.eas.projectId` and throws without it. Measured on the baseline shell (Expo SDK 58.0.25, React Native 0.88.1, emulator API 36, debug build): the app shows a red screen before the first route renders, "Exception in HostFunction: Project ID is required to send observability metrics. Make sure you have configured it correctly in app.json." Screenshot: `docs/plans/FND-05-evidence/android-expo-observe-without-project-id.jpg`. On iOS the same build only logs a warning and runs.

Nothing in the app imported the package; being installed was enough, because Expo autolinks it.

## Decision

`expo-observe` is not installed in the FND-05 shell. It is added in the EAS half of FND-05, in the same change that sets `extra.eas.projectId`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Put a made-up project id in the app config | The module would start and try to report to a project that doesn't exist, and a fake identifier in the config is the kind of placeholder that survives into a real build. |
| Keep it installed and exclude it from Android autolinking | The build would pass without proving anything about the library, and the exclusion would have to be remembered and removed. |
| Drop EAS Observe from the stack | Nothing found here argues against the library itself; it needs an account, like EAS Update. |

## Consequences

- The library is unproven on React Native 0.88 until the EAS half builds it. Its Android behaviour means the project id and the package must land together: adding one without the other breaks every Android launch.
- Any build variant that has no project id (a fork, a contributor without access) must not include the package. If such builds are wanted later, guard the dependency behind the same condition as the project id.
- Revisit if a later `expo-observe` release tolerates a missing project id on Android, as it already does on iOS.
