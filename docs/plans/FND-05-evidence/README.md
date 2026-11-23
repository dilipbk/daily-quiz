# FND-05 (local half): build evidence

Collected on one Mac (Apple silicon, macOS 27.2) in two sittings: 2026-11-15 and, after `main` was merged in, 2026-11-23. Nothing here used an account, a key or a secret.

| | |
|---|---|
| Expo SDK, React Native, React | 58.0.25, 0.88.1, 19.3.0 |
| Node, pnpm | 26.13.1 (through pnpm's `devEngines`), 11.28.9 |
| Xcode, simulator | 26.6; iPhone 17 Pro, iOS 26.5 |
| JDK, Gradle, NDK | Homebrew OpenJDK 17.0.19; Gradle 9.4.1 (wrapper); NDK 27.1.12297006 |
| Android SDK, emulator | platform 37 and build-tools 37.0.0 (fetched by Gradle); `Medium_Phone_API_36`, arm64, 4 KB pages |
| Every resolved version | [`versions.md`](versions.md) |

## Result

The release builds and the web export are of the pull request's final code. Each started from `expo prebuild --clean`.

| Build | Date | Command | Result | Smoke report |
|---|---|---|---|---|
| iOS, release, simulator | 11-23 | `expo run:ios --configuration Release` | `› Build Succeeded` | 42 pass, 0 fail, 0 skipped: [`smoke-ios-release.txt`](smoke-ios-release.txt) |
| Android, release, arm64 | 11-23 | `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a` | `BUILD SUCCESSFUL in 11m 1s`, 64 MB APK | 41 pass, 0 fail, 1 skipped: [`smoke-android-release.txt`](smoke-android-release.txt) |
| Web | 11-23 | `pnpm --filter @repo/mobile web:export`, then `expo serve` | `Exported: dist` (server output) | 33 pass, 0 fail, 9 skipped: [`smoke-web.txt`](smoke-web.txt) |
| iOS, debug (development build) | 11-15 | `expo run:ios` | `› Build Succeeded` | 40 pass, 0 fail, 0 skipped: [`smoke-ios-debug.txt`](smoke-ios-debug.txt) |
| Android, debug (development build) | 11-15 | `expo run:android --variant debug` | `BUILD SUCCESSFUL in 6m 19s` | 39 pass, 0 fail, 1 skipped: [`smoke-android-debug.txt`](smoke-android-debug.txt) |
| Android, release, all ABIs | 11-15 | `expo run:android --variant release` | `BUILD SUCCESSFUL in 12m 16s`, 187 MB APK | 16 KB check below |

Both release apps were launched with no Metro server running. The one skip on Android is Sign in with Apple (iOS only); the nine on web are native-only libraries.

The debug builds predate the merge of `main`. Since then the app gained two checks (the quiz-engine fixtures and the game-rules dates, which is why the counts differ by two), took Expo's new pin for `expo-web-browser` (58.0.8 to 58.1.0), and moved Better Auth and i18next back one or two patches (see `versions.md`). The development client itself was not rebuilt after the merge.

`expo install --check` (11-23): "Dependencies are up to date". `expo-doctor` (11-23): "20/20 checks passed. No issues detected!".

## Shared packages on Hermes (asked for by the PM)

Read from the release builds, so this is Hermes bytecode with no dev server. Identical on iOS and Android:

| Check | Result |
|---|---|
| `runSharedFixtures()` from `@repo/quiz-engine/fixtures` (ENG-02) | `127 fixtures ran, 0 failed` |
| `localDateOf` from `@repo/game-rules` (ENG-03, ADR 0005) | `2026-01-02 2026-06-16 2026-03-07 2026-03-08 2026-03-08 2026-03-09 2026-10-31 2026-11-01 2026-11-01 2026-11-02; unknown zone: RangeError; empty zone: RangeError` |
| `Intl.DateTimeFormat('en-US', { timeZone, year, month: '2-digit', day: '2-digit' })` | `Kathmandu 01/02/2026, Los Angeles 12/31/2025` |
| Regex literals with the `u` flag: `\p{L}`, `\p{M}`, `\p{Z}`, `\p{Cc}`, `\p{Cf}`, `\p{Cs}` | pass (each matches its sample and rejects `1`) |
| `Object.hasOwn`, `Array.prototype.at`, `'é'.normalize('NFD').length === 2` | pass |
| zod 4.6.7: `z.strictObject` and `z.discriminatedUnion` | pass (accepts the valid value, rejects an unknown key and an unknown discriminator) |

The ten dates are, in order: Kathmandu (a 45-minute offset) at 18:30 UTC on 1 January; Kiritimati (+14:00) from ADR 0005's own example; then the minute before and the minute of local midnight in Los Angeles on each side of the 8 March and 1 November 2026 clock changes. They match Node 26.13.1 exactly (`src/smoke/hermes-probes.test.ts` runs the same probes on Node).

One thing Hermes does not have: `Intl.PluralRules` (and `Intl.Locale`). The i18n row reads "PluralRules polyfilled" on both native platforms and "built in" on web.

## Screenshots

| | Light, default text | Dark, largest text |
|---|---|---|
| iOS (release build) | [`ios-light.jpg`](ios-light.jpg) | [`ios-dark-largest.jpg`](ios-dark-largest.jpg) (`accessibility-extra-extra-extra-large`) |
| Android (release build) | [`android-light.jpg`](android-light.jpg) | [`android-dark-largest.jpg`](android-dark-largest.jpg) (font scale 2.0) |
| Web | [`web.jpg`](web.jpg) (480 px wide) | |

[`android-expo-observe-without-project-id.jpg`](android-expo-observe-without-project-id.jpg) is the failure ADR 0009 records.

The reports are the app's own output: the placeholder screen runs one check per library and logs each result (`[smoke] …`). They were read from `adb logcat -s ReactNativeJS` (Android release), `xcrun simctl spawn booted log stream` (iOS release), Metro's log (debug builds) and the browser console (web).

## Android 16 KB page size

`apps/mobile/scripts/check-page-size.sh` runs the two checks Android's page-size guide gives: `zipalign -c -P 16 -v 4`, and the alignment of every `LOAD` segment in every 64-bit library (`llvm-objdump -p`, 2**14 or more).

On the release APK that was launched (11-23, arm64), full output in [`page-size-check.txt`](page-size-check.txt):

```
PASS: all 38 64-bit libraries are 16 KB aligned, and the APK is zip-aligned for 16 KB pages
```

On the all-ABI release APK (11-15, so before the merge; it adds the x86_64 libraries), full output in [`page-size-check-all-abis-2026-11-15.txt`](page-size-check-all-abis-2026-11-15.txt):

```
PASS: all 76 64-bit libraries are 16 KB aligned, and the APK is zip-aligned for 16 KB pages
```

The emulator itself has 4 KB pages (`adb shell getconf PAGE_SIZE` gives `4096`), so nothing here ran on a 16 KB device: see "Not proven".

## Things the build commands did that the plan didn't expect

Each is either fixed in this pull request or recorded in an ADR.

- **`expo-observe` crashes Android at start-up without an EAS project id.** Removed (ADR 0009).
- **`expo run:ios` refuses to build for a simulator** when the app has the Sign in with Apple entitlement and the Mac has no signing certificate ("No code signing certificates are available to use"). The entitlement is stripped until the Apple account exists (ADR 0010).
- **A plain Gradle release build failed** at `:app:createBundleReleaseJsAndAssets` with "Cannot find module 'babel-preset-expo'". Under pnpm's isolated `node_modules` the app can only resolve its own dependencies, and `babel.config.js` names that preset. `expo run:android` hides this because Expo CLI bundles the JavaScript itself. EAS Build runs plain Gradle, so it would have failed there. Fixed by making `babel-preset-expo` a dev dependency of the app.
- **Gradle doesn't rebuild the JavaScript bundle when only a dependency changes.** After a version change in `node_modules` the bundle task reported `UP-TO-DATE` and the APK kept the old code. Run `expo prebuild --clean`, or Gradle with `--rerun-tasks`, after changing a dependency.
- **pnpm wrote release-age exemptions into `pnpm-workspace.yaml` by itself** for two libraries published the same day. Removed (ADR 0006).
- **Expo's pins moved between the two sittings**: `expo install --check` asked for `expo-web-browser` ~58.1.0 on 11-23. Taken with `expo install --fix` before the release builds.
- **`expo run:android` builds and installs, then fails to launch**: it looks for `com.dailyquizshell` (derived from the slug) and not the configured `dev.dailyquiz.shell`. Launching by hand works: `adb shell am start -a android.intent.action.VIEW -d "dailyquiz://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"` after `adb reverse tcp:8081 tcp:8081`.
- **Installing on the emulator failed twice with `INSTALL_FAILED_INSUFFICIENT_STORAGE`**: its data partition had about 540 MB free. The 187 MB all-ABI release APK did not fit, which is why the launched release APK is arm64-only.
- **iOS cuts a log message off at 1,024 bytes**, so the smoke report is logged one line per check.
- **Gradle downloaded Android platform 37 and build-tools 37.0.0** into the SDK folder by itself.

## Not proven

- A launch on a 16 KB-page device or emulator. It needs the image `system-images;android-36;google_apis_ps16k;arm64-v8a`, which is the owner's to install.
- A physical iPhone or Android phone.
- An x86_64 Android build of the final code (the all-ABI build is from 11-15).
- The development builds on the final code (they are from 11-15).
- Anything that needs an account: EAS Build, EAS Update, `expo-observe`, Sentry and PostHog reporting, sign-in with Apple or Google, push tokens.
- Gesture Handler beyond one pan gesture, and Skia beyond one canvas.
