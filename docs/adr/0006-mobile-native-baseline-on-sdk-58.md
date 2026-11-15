# 0006. Mobile native baseline on Expo SDK 58: Expo's pins first, proven by a smoke build

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `FND-05` (local half) |
| **Requirements** | Spec §18.2; roadmap §3.1 (mobile table), §9 ("A library isn't ready for React Native 0.88") |

## Context

Roadmap §3.1 lists the app's libraries with versions checked on 2026-11-14, and §9 names the risk that some don't yet work on React Native 0.88. Several libraries make no statement about 0.88, and in a few places the library's own documentation disagrees with the version Expo pins for SDK 58.

FND-05 built all of them together in `apps/mobile` and ran each one on a device. On 2026-11-15, with Expo 58.0.25, React Native 0.88.1, React 19.3.0, Xcode 26.6, JDK 17.0.19, NDK 27.1.12297006 and Node 26.13.1:

- iOS debug build on an iPhone 17 Pro simulator (iOS 26.5): 40 checks pass.
- Android debug and release builds on an API 36 emulator: 39 pass, 1 skipped (Sign in with Apple is iOS only). The release APK ran with Metro stopped.
- Web export with `web.output: "server"`, served and loaded in a browser: 31 pass, 9 skipped (native-only libraries).
- The Android release APK passes the 16 KB page-size check.

The commands, logs, screenshots and per-library results are in `docs/plans/FND-05-evidence/`. Every resolved version is in `docs/plans/FND-05-evidence/versions.md`, generated from the lockfile.

## Decision

The versions in `versions.md` are the app's baseline. Expo-managed packages are installed with `expo install` and keep the SDK's pin; a pin is overridden only when a build or a launch proves it wrong, with an ADR. Libraries Expo doesn't pin are held at the roadmap's minor.

Where the build settled a disagreement, this is what we use:

| Library | Roadmap §3.1 | Baseline | Why |
|---|---|---|---|
| Gesture Handler | "at the SDK's pin" | 3.3.0 | ADR 0012 |
| Worklets | 0.13 | 0.13.0 (Expo's pin; npm has 0.13.1) | Builds and runs a worklet on the UI thread on both platforms. 0.13.1 only fixes a Jest resolver under pnpm that our tests don't use yet. |
| Nitro Modules | 0.37 | 0.37.1 exactly (npm has 0.37.2) | Unistyles 3.8.1 is built against 0.37.1 and its docs say to pin it. MMKV 4.3.2, built on Nitro 0.35.9, links and runs against it. |
| Sentry | not versioned | 8.28.0 (Expo's pin; npm has 8.35.0) | Builds in debug and release in this pnpm workspace with upload disabled. Sentry's fixes for React Native 0.88 are in 8.33 to 8.35: re-check the pin when the SDK is switched on (EAS half). |
| Skia | 2.14 | `@shopify/react-native-skia` 2.14.0 | Builds on both platforms and on web. See "Open questions". |
| TanStack persistence | "persisted to MMKV" | `@tanstack/query-async-storage-persister` | The sync persister is deprecated. |
| ICU | "i18next 27 with ICU" | plus `@formatjs/intl-locale` and `@formatjs/intl-pluralrules` | Hermes on both platforms has no `Intl.PluralRules`; without the polyfills an ICU plural throws. Measured: "PluralRules polyfilled" on iOS and Android, "built in" on web. |
| EAS Observe | planned | not installed | ADR 0009 |
| Sign in with Apple | planned | installed, entitlement removed | ADR 0010 |
| Google sign-in | library not named | `@react-native-google-signin/google-signin` 17.0.0 | ADR 0011 |

Left out of this build because the spec schedules them for V1 or later, to be checked on the SDK current when they are adopted: `expo-sqlite`, `expo-widgets`, the image picker, manipulator and camera, `expo-store-review`, RevenueCat.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Take npm's latest for every library | Expo tests its pins together; `expo install --check` and `expo-doctor` then report mismatches on every run. All but one of the newer releases fix nothing we hit. |
| Trust each library's compatibility table instead of building | Three tables were wrong for our case in opposite directions: Gesture Handler 3.3 is listed as unsupported on 0.88 and works; `expo-observe` is listed for SDK 58 and crashes Android without an account. |

## Consequences

What later tickets must know, all found by running the shell:

- **Themes.** Unistyles updates styles natively only on React Native's own components. A themed style on a third-party view (we tried `SafeAreaView` from `react-native-safe-area-context`) keeps the old theme's colours after a light/dark switch. Put themed styles on React Native views and read insets from Unistyles' runtime, or wrap the component with `withUnistyles`. On iOS, a style that depends on `fontScale` did not refresh when the text size changed until the app restarted.
- **Web.** With `web.output: "server"` a custom `src/app/+html.tsx` must render `headNodes` and `bodyNodes` from `useServerDocumentContext()` (`expo-router/html`). Without them the page is served with no script or style tags and never becomes interactive. Unistyles' Expo Router guide doesn't show this. `posthog-react-native` on web needs `persistence: 'memory'` or a custom storage.
- **Skia on web** needs `public/canvaskit.wasm`, copied by `setup-skia-web public` (part of `pnpm --filter @repo/mobile web:export`, git-ignored, 8 MB).
- **Never `await import('react-native')`.** Enumerating the module touches its deprecated getters and throws on iOS (`new NativeEventEmitter()` requires a non-null argument). Import from it statically.
- **pnpm and Babel.** `babel-preset-expo` must be a dev dependency of the app. `babel.config.js` names it, and under pnpm's isolated `node_modules` a plain Gradle release build (which is what EAS runs) can't resolve it otherwise: `:app:createBundleReleaseJsAndAssets` fails with "Cannot find module 'babel-preset-expo'". `expo run:android` hides the problem because Expo CLI bundles the JavaScript itself. The same rule applies to any Babel plugin the config names.
- **Install scripts.** pnpm 11 fails the install until each script is decided. `@sentry/cli` and `@parcel/watcher` are set to `false` in `pnpm-workspace.yaml`; the EAS half turns `@sentry/cli` on when source-map upload is wired.
- **Expo CLI on this setup.** `expo run:ios --device "<simulator name>"` and `expo run:android`'s launch step both misbehave (details in the evidence README); neither affects the build.
- `expo-updates` reports `isEnabled: true` inside a development build even with `updates.enabled: false`, because the development client loads through it. The release build is the one to read.

Open questions for the EAS half:

- Skia 2.14.0's Android build is reported to run out of memory on EAS medium workers; the fix shipped only under the new package name `react-native-skia` (2.15.2 and later). It built locally. If EAS fails, the move is to `react-native-skia@2`, with `expo.install.exclude`.
- Everything in the plan's "Not in this half" list: `eas.json` (set Node 26.13.1 in every profile), the EAS project id, EAS Update, Sentry and PostHog keys, Google client ids, push credentials, the Apple team, the real bundle identifier.

Revisit this baseline at each Expo SDK upgrade by re-running the smoke screen on all three platforms.
