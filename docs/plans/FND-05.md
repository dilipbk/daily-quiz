# FND-05 (local half): native dependency smoke build

> **Status: approved by the owner on 2026-11-15 and carried out.** What changed while building is listed under "Amendments" at the end; the evidence is in `docs/plans/FND-05-evidence/`.

## Context

The roadmap's biggest unproven assumption is that every planned native library builds together on Expo SDK 58 / React Native 0.88 (roadmap §9: "Several have no explicit statement yet"). FND-05 exists to prove it in week 1, before any ticket depends on those libraries. The cloud accounts (FND-04) don't exist yet, so the PM split the ticket: this half proves everything that needs no account. The EAS half (EAS Build, EAS Update, Sentry and PostHog keys, store credentials) waits for FND-04.

Outcome: `apps/mobile`, an empty SDK 58 shell with one placeholder screen; three green local builds (iOS simulator, Android emulator, web export) with evidence; Android passing the 16 KB page-size check; every resolved version recorded; one ADR per incompatibility or substitution; `pnpm verify` green; one pull request, left for the owner to merge.

**Ticket:** roadmap §6, row FND-05. Size M confirmed (one app, several files, a new pattern; no schema or contract). **Spec:** §18.2 as amended by roadmap §3.3; the library list is roadmap §3.1's mobile table. **Branch:** `chore/FND-05-native-smoke-build`.

## What the plan rests on (checked 2026-11-15)

- **This Mac can build both platforms.** Xcode 26.6 with iOS 26.5 simulators (SDK 58 needs 26.4+), CocoaPods 1.16.2, Android SDK with NDK 27.1.12297006 and CMake 3.22.1 (both what RN 0.88 wants), emulator `Medium_Phone_API_36`, Homebrew JDK 17.0.19 (the version React Native asks for; `JAVA_HOME` is set per command), Node 26.13.1 through pnpm 11.28.9 (supported). **Missing:** Android platform 37 and build-tools 37.0.0 (see decision 9), Android Studio (not needed), a 16 KB-page emulator image (not needed for the check itself).
- **npm today:** `expo` 58.0.25 pins React Native 0.88.1 and React 19.3.0.
- **The official docs disagree with the roadmap or with Expo's own pins in five places.** These are the likely ADRs:

  | Library | Finding | Plan |
  |---|---|---|
  | Gesture Handler | Expo pins `~3.3.0`; the library's own table lists RN 0.88 only from 3.4 | Build on Expo's pin first. If it fails to build or run, move to 3.5.0 and record why. Either result gets an ADR. |
  | Nitro Modules | Unistyles 3.8.1 is built against, and its docs pin, exactly 0.37.1 (npm latest is 0.37.2); MMKV 4.3.2 was built on Nitro 0.35.9 | Install 0.37.1 exactly. Whether MMKV links against it is the thing this build proves. |
  | `expo-observe` | Its Android module appears to throw at start-up when there is no EAS project id (read from source) | Install and try. If it throws, take it out of this half and defer it to the EAS half, with an ADR. |
  | Skia | `@shopify/react-native-skia` stops at 2.14.0 (Expo's pin, the roadmap's version); later releases moved to the package name `react-native-skia`, and 2.14.0's Android build is reported to run out of memory on EAS medium workers | Build 2.14.0 locally as planned. Record the rename as a question for the EAS half. |
  | ICU on Hermes | Hermes has no `Intl.PluralRules` or `Intl.Locale`, which `i18next-icu` needs | Add `@formatjs/intl-locale` and `@formatjs/intl-pluralrules` (JavaScript only). |

- Smaller facts used below: `create-expo-app` needs `@sdk-58` or it scaffolds SDK 57; pnpm's isolated `node_modules` is supported and Metro configures itself for the workspace; the Sentry plugin only warns without an organisation, and `disableAutoUpload` keeps release builds from needing a token; the Google sign-in plugin fails prebuild unless given an `iosUrlScheme`; TanStack's sync persister is deprecated in favour of the async one; MMKV's hooks throw during server render on web (the plain API doesn't).
- **The repo's checks reach into the app.** Root ESLint is strict and type-aware and lints every file; Prettier checks everything not ignored at the root; `pnpm typecheck` runs each workspace's `typecheck`; Vitest includes `packages/*` only.
- `docs/design/` doesn't exist yet, and the placeholder is a diagnostic, not a designed screen. No row in `docs/traceability.md` cites FND-05 or §18.2, so there is no status to move.

Full research notes, with a source for each claim, are in the team's shared notes folder (`fnd-05-research-expo-core.md`, `fnd-05-research-native-libs.md`, `fnd-05-research-services.md`).

## Decisions I'm asking you to approve

1. **Library set.** Everything in roadmap §3.1's mobile table, plus the MVP-native rows of spec §18.2 the table leaves out: `expo-haptics`, `expo-audio`, `expo-image`, `expo-video`, `expo-sharing`. Left out, to be checked on whatever SDK is current when they're adopted: the V1/V2 libraries (`expo-sqlite`, `expo-widgets`, image picker, manipulator and camera, `expo-store-review`, RevenueCat) and the ones the roadmap removed (Rive, Storybook, MSW).
2. **Expo's pins come first.** Expo-managed packages are installed with `expo install` and keep the SDK's pin. A pin is overridden only when the build or the launch proves it wrong, and then with an ADR. Libraries Expo doesn't pin take the roadmap's minor at its latest patch, except Nitro (0.37.1 exactly) and Better Auth (1.7.25 exactly, per the roadmap).
3. **Native projects are generated, not committed.** `ios/` and `android/` come from `expo prebuild` and are git-ignored; native configuration lives in the app config and config plugins. Recorded as an ADR.
4. **Placeholder identity.** Name "Daily Quiz shell", scheme `dailyquiz`, bundle identifier and Android package `dev.dailyquiz.shell`. Never uploaded; the real identifier is chosen in the EAS half after DS-01's trademark check (roadmap A12).
5. **The placeholder screen is a smoke report.** One route that renders each visual library once and lists every library as pass, fail or "not on this platform". The screenshots then show that each native module loaded, not only that the app opened.
6. **Jest arrives now, minimally.** The smoke runner is logic, so it is written test-first with `jest-expo` 58 and Testing Library 14.1, and the root `test` script runs the app's Jest after Vitest so `pnpm verify` and CI cover it.
7. **Evidence is committed** under `docs/plans/FND-05-evidence/`: commands, trimmed output, the page-size check output and five small screenshots. The CLI can't attach images to a pull request.
8. **Android gets two builds:** debug (the development build that launches on the emulator) and a release APK. The 16 KB check runs on the release APK, and launching it proves the app starts without Metro.
9. **Gradle may download Android platform 37 and build-tools 37.0.0** into `~/Library/Android/sdk`. That is the Android Gradle plugin's normal behaviour when the SDK licences are accepted. If it refuses, I stop and report `BLOCKED` with `sdkmanager "platforms;android-37.0" "build-tools;37.0.0"` for you to run. Anything else missing (a JDK, an emulator image) is reported the same way, not installed.
10. **Web output is `server`**, the roadmap's choice and the template's default.
11. **Google sign-in is built with `@react-native-google-signin/google-signin` 17.0.0**, the library Better Auth's guide uses, with a placeholder URL scheme. Expo's docs now list `react-native-nitro-google-signin` first; the ADR records both and leaves the final choice to BE-03, which does the first real integration.

## Files

```
apps/mobile/
├── package.json        @repo/mobile; main: index.ts; scripts: start, ios, android, web:export, typecheck, test
├── app.config.ts       placeholder identity; plugins; typedRoutes and reactCompiler on; web.output server;
│                       updates.enabled false; no EAS project id, no keys
├── index.ts            imports ./src/unistyles, then expo-router/entry
├── babel.config.js     babel-preset-expo + ['react-native-unistyles/plugin', { root: 'src' }]
├── metro.config.js     Expo's default config
├── tsconfig.json       extends expo/tsconfig.base, plus the repo's strict flags
├── jest.config.js      preset jest-expo; Unistyles mocks; Reanimated resolver; Gesture Handler setup
└── src/
    ├── unistyles.ts    StyleSheet.configure with this screen's light and dark themes
    ├── app/
    │   ├── _layout.tsx GestureHandlerRootView, QueryClientProvider, NativeTabs with one tab
    │   ├── +html.tsx   imports ../unistyles for server-rendered web
    │   └── index.tsx   thin route: renders SmokeScreen
    └── smoke/
        ├── run-checks.ts (+ .test.ts)    pure runner
        ├── checks.ts                     one entry per library
        ├── results-list.tsx (+ .test.tsx) FlashList of results
        ├── render-strip.tsx              one instance of each visual library
        ├── skia-swatch.tsx               the Skia canvas, loaded lazily
        ├── smoke-screen.tsx              composes strip and list
        └── index.ts                      the folder's public surface
```

Root files touched: `package.json` (`test` script), `pnpm-lock.yaml`, `pnpm-workspace.yaml` (only if a library needs its install script approved under `allowBuilds`), `.gitignore` (`.expo/`, `apps/mobile/ios/`, `apps/mobile/android/`, `apps/mobile/public/canvaskit.wasm`, `expo-env.d.ts`), `eslint.config.js` (ignore the generated folders; CommonJS globals for the app's Babel, Metro and Jest config files). Docs: `docs/plans/FND-05.md`, `docs/plans/FND-05-evidence/`, `docs/adr/0003` onward. Nothing under `packages/` changes.

## Smoke design

`run-checks.ts`:

```ts
type Platform = 'ios' | 'android' | 'web';
type CheckStatus = 'pass' | 'fail' | 'skipped';
interface Check { id: string; label: string; platforms: readonly Platform[]; run: () => unknown }
interface CheckResult { id: string; label: string; status: CheckStatus; detail: string }
function runChecks(checks: readonly Check[], platform: Platform, timeoutMs = 5000): Promise<CheckResult[]>
```

Each entry in `checks.ts` loads its library with `await import()` inside `run` and makes one call that reaches native code, so a module that didn't link is one failed row, not a crash that hides the others. Checks run in an effect, so server rendering on web never touches them. Examples: MMKV writes and reads a key; SecureStore reports availability; Localization returns a locale tag; Notifications reads permissions; Updates reports `isEnabled`; Apple authentication reports availability; Skia creates a paint; i18next formats an ICU plural; XState runs a two-state machine (created at module scope, as React Compiler requires); TanStack Query persists one entry through the async persister into MMKV. Service SDKs are loaded and never started: Sentry without `init`, PostHog constructed with `disabled: true`, Better Auth's client built against a `.invalid` URL, Google sign-in imported only.

`render-strip.tsx` shows one of each visual piece: a Unistyles-themed surface, a Reanimated value driven by a Gesture Handler gesture, an SVG ring, an `@expo/ui` control inside `Host`, a `GlassView`, a `SymbolView` with a fallback, an `expo-image`, and the lazy Skia canvas. The results render in a FlashList.

## Tasks, in order

**1. Branch and baseline shell.** Create the branch from `origin/main`; `git config user.email` is already the noreply address used on `main`. Scaffold with `pnpm create expo-app --template blank-typescript@sdk-58 apps/mobile --no-install --no-agents-md`, set the identity and config above, add Expo Router and the other Expo-managed libraries with `pnpm exec expo install` from `apps/mobile`. `expo prebuild --clean`, then build and launch on iOS and Android once. This tells "this Mac's toolchain" failures (reported `BLOCKED`) apart from library failures (ADRs). Commit.

**2. Smoke runner, test-first.** Jest config with `@react-native/jest-preset@0.88.1` and `test-renderer`. Failing tests for `runChecks` first: a passing check reports `pass` with its detail; a throwing check and a rejecting check report `fail` with the message and don't stop later checks; a check not listed for the platform reports `skipped` and isn't run; a check that never settles fails with "timed out"; duplicate ids are rejected; an empty list returns an empty list. Then the implementation. Then `results-list.test.tsx`: one row per result, each row's accessibility label carries the library and its status. Wire the root `test` script. `pnpm verify` green. Commit.

**3. Third-party libraries and the checks.** Install Unistyles 3.8.1, Nitro 0.37.1, MMKV 4.3.2, Reanimated, Worklets, Gesture Handler, Skia, SVG and FlashList at Expo's pins, Sentry at Expo's pin with `disableAutoUpload`, PostHog 4.86 with its four Expo peers, Better Auth 1.7.25 with its five, Google sign-in 17.0.0, i18next 27 with ICU and the two polyfills, XState 5, TanStack Query 5 with the persist client and async persister, Zustand 5. Approve only install scripts a library actually needs. Write the checks, the strip, the screen, the entry file and the Babel config. Run `expo install --check` and `expo-doctor`. Commit.

**4. iOS.** `expo prebuild --clean`, then `expo run:ios --device "iPhone 17 Pro"` (iOS 26.5, so the glass effect is real). Proof: build log tail; a screenshot in light; a screenshot in dark at the largest accessibility text size; every row `pass` or `skipped`.

**5. Android.** `JAVA_HOME` on JDK 17, `expo run:android --variant debug` on `Medium_Phone_API_36`, same screenshots. Then `--variant release`, launched with Metro stopped. Page-size check on the release APK: `zipalign -c -P 16 -v 4`, and `llvm-objdump -p` on every `.so` in `lib/arm64-v8a` expecting `LOAD … align 2**14` or more. Proof: log tails, screenshots, the check's full output.

**6. Web.** `setup-skia-web public`, `expo export --platform web`, serve the output with `expo serve`, load it. Proof: export log, browser screenshot, native-only rows `skipped`.

**7. When something doesn't build or load** (`superpowers:systematic-debugging`): reproduce, read the library's docs and issues, try the documented fix. If there is none, take the library out of the shell, keep the failing output, and write an ADR naming the substitution or the condition for retrying (the roadmap already names Legend List for FlashList). The other libraries are still proven.

**8. Records.** ADR 0003 (versions resolved on SDK 58, with a table generated from the lockfile and every deviation from roadmap §3.1), ADR 0004 (generated native projects), ADR 0005 (Google sign-in), plus one ADR per incompatibility or substitution found. All `Proposed`. The evidence folder. This plan saved as `docs/plans/FND-05.md`. FND-03 may also be numbering ADRs; I take the next free numbers when the pull request opens and say so in the report.

**9. Verify and hand over.** `pnpm install --frozen-lockfile && pnpm verify` in a clean checkout of the branch; re-read the whole diff; push; open the pull request; report in the team guide's format with the EAS half under "Not done or not verified".

## Done-when, and how each line is proven

| Line | Proof |
|---|---|
| Builds and launches on iOS | `expo run:ios` log tail; simulator screenshots (light; dark at largest text) |
| Builds and launches on Android | `expo run:android` log tail; emulator screenshots (light; dark at largest text) |
| Exports for web | `expo export --platform web` output; browser screenshot of the served export |
| Android passes the 16 KB check | Full output of both alignment checks on the release APK |
| Every library installed and imported | The on-screen report in each screenshot; the `runChecks` tests |
| Versions recorded | ADR 0003's table, generated from the lockfile |
| Any incompatibility has an ADR | One ADR each, with the failing output |
| `pnpm verify` green | Output from a clean checkout; the pull request's `verify` check |

## Risks this plan is built to catch

1. A library compiles but its native half isn't registered at runtime: caught by the per-library checks, not by the build.
2. The release build behaves differently from debug (Hermes bytecode, R8, minification): caught by launching the Android release APK.
3. A library touches `window` at import and breaks server-rendered web export: checks run only in an effect, and Skia loads lazily.
4. A clean clone can't install (lockfile drift, an unapproved install script): caught by the frozen-lockfile run and by CI on Ubuntu.
5. The generated native projects aren't reproducible: each platform's final build starts from `expo prebuild --clean`.

## Not in this half (goes in the report)

`eas.json` and EAS Build profiles (Node 26.13.1 must be set there), the EAS project id, EAS Update URL and channels, `expo-observe` if it needs the project id, Sentry DSN, organisation, token and source-map upload, the PostHog key, Google client ids, push credentials, the Apple team and the real bundle identifier, store credentials, a launch on a physical device, and a launch on a 16 KB-page emulator (needs `system-images;android-36;google_apis_ps16k;arm64-v8a`, which is the owner's to install).

## Amendments made while building

1. **ADR numbers.** The PM assigned this ticket 0006, 0007 and 0009 onward (0003 to 0005 and 0008 belong to ENG-01 and ENG-02). The plan's "0003, 0004, 0005" became 0006 (baseline and versions), 0007 (generated native projects) and 0011 (Google sign-in). The build added 0009 (`expo-observe`), 0010 (Sign in with Apple entitlement) and 0012 (Gesture Handler pin).
2. **Hermes probes.** At the PM's request the smoke screen also evaluates, on Hermes, the language features the shared packages rely on: Unicode property escapes in regex literals, `Object.hasOwn`, `Array.prototype.at`, `String.prototype.normalize`, zod 4, and `Intl.DateTimeFormat` with a time zone.
3. **`expo-observe` was removed** (ADR 0009) and the **Sign in with Apple entitlement is stripped** (ADR 0010); the plan had foreseen the first and not the second.
4. **The results list is plain views**, and FlashList is rendered once in the strip, so the list's test doesn't depend on FlashList's layout measurement.
5. **`babel-preset-expo` became a dev dependency**, and `apps/mobile/scripts/check-page-size.sh` was added so the 16 KB check can be re-run by anyone.
6. **The launched Android release APK is arm64-only**, because the all-ABI APK (187 MB) didn't fit on the emulator. The 16 KB check ran on both.
7. **iOS was built with `expo run:ios` and no `--device` flag**, on the booted iPhone 17 Pro.
8. **No `metro.config.js`.** Expo's default Metro configuration handles the pnpm workspace without one.
9. **Better Auth is pinned to 1.7.23 and i18next resolves to 27.1.1**, not the newest patches: those were under pnpm's one-day minimum release age (ADR 0006).
