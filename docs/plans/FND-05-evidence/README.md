# FND-05 (local half): build evidence

Collected on one Mac (Apple silicon, macOS 27.2) in two sittings: 2026-11-15 and, after `main` was merged in, 2026-11-23. Nothing here used an account, a key or a secret.

| | |
|---|---|
| Expo SDK, React Native, React | 58.0.26, 0.88.1, 19.3.0 (the 2026-11-15 builds: Expo 58.0.25) |
| Node, pnpm | 26.13.1 (through pnpm's `devEngines`), 11.28.9 |
| Xcode, simulator | 26.6; iPhone 17 Pro, iOS 26.5 |
| JDK, Gradle, NDK | Homebrew OpenJDK 17.0.19; Gradle 9.4.1 (wrapper); NDK 27.1.12297006 |
| Android SDK, emulator | platform 37 and build-tools 37.0.0 (fetched by Gradle); `Medium_Phone_API_36`, arm64, 4 KB pages |
| Every resolved version, and what moved between the sittings | [`versions.md`](versions.md) |

## Result

| Build | Commit | Command | Result | Smoke report |
|---|---|---|---|---|
| iOS, release, simulator | `1df88b7` | `expo run:ios --configuration Release` | `› Build Succeeded` | 55 pass, 0 fail, 0 skipped: [`smoke-ios-release.txt`](smoke-ios-release.txt) |
| Android, release, arm64 | `1df88b7` | `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a` | `BUILD SUCCESSFUL` | 54 pass, 0 fail, 1 skipped: [`smoke-android-release.txt`](smoke-android-release.txt) |
| Web | `1df88b7` | `pnpm --filter @repo/mobile web:export`, then `expo serve` | `Exported: dist` (server output) | 41 pass, 0 fail, 14 skipped: [`smoke-web.txt`](smoke-web.txt) |
| iOS, debug (development build) | 2026-11-15 tree | `expo run:ios` | `› Build Succeeded` | 40 pass, 0 fail, 0 skipped: [`smoke-ios-debug.txt`](smoke-ios-debug.txt) |
| Android, debug (development build) | 2026-11-15 tree | `expo run:android --variant debug` | `BUILD SUCCESSFUL in 6m 19s` | 39 pass, 0 fail, 1 skipped: [`smoke-android-debug.txt`](smoke-android-debug.txt) |
| Android, release, all ABIs | 2026-11-15 tree | `expo run:android --variant release` | `BUILD SUCCESSFUL in 12m 16s`, 187 MB APK | 16 KB check below |

Both release apps were launched with no Metro server running. The one skip on Android is Sign in with Apple (iOS only); the fourteen on web are native-only libraries.

How the release builds of `1df88b7` were made: the native projects were generated with `expo prebuild --clean` and built in full on 2026-11-23 at `bfbdde0` (iOS `› Build Succeeded`; Android `BUILD SUCCESSFUL in 11m 1s`, 64 MB APK). The three commits after that changed only the app's TypeScript, so the builds of `1df88b7` reused those native projects and rebuilt the JavaScript bundle (Android `BUILD SUCCESSFUL in 29s`). No dependency changed in between. The PM's reviewer separately built the Android release from a clean checkout of `bfbdde0` in 8m 5s.

### Where each file comes from

| File | Captured from |
|---|---|
| `smoke-ios-release.txt`, `smoke-android-release.txt`, `smoke-web.txt` | Commit `1df88b7`, 2026-11-23. Written by the commands below, never edited. |
| `page-size-check.txt` | The arm64 release APK of `1df88b7`. |
| `ios-light.jpg`, `ios-dark-largest.jpg`, `android-light.jpg`, `android-dark-largest.jpg`, `web.jpg` | The release builds and the web export of `1df88b7`. |
| `versions.md` | The lockfile of `1df88b7`. |
| `smoke-ios-debug.txt`, `smoke-android-debug.txt`, `page-size-check-all-abis-2026-11-15.txt` | The working tree of 2026-11-15, before it was committed; the nearest commit is `d2303f4`. They predate the merge of `main` and 18 dependency moves (`versions.md`). |
| `android-expo-observe-without-project-id.jpg` | The baseline shell of 2026-11-15, with `expo-observe` still installed. |

The reports are the app's own output: the placeholder screen runs its checks and logs one `[smoke]` line for each.

```bash
# Android release
adb logcat -d -s ReactNativeJS:V | sed -n 's/.*ReactNativeJS: //p' | grep '^\[smoke\]'
# iOS release (started before the app is launched)
xcrun simctl spawn booted log stream --level info --style compact --predicate 'eventMessage CONTAINS "[smoke]"'
# Web: headless Chrome's console
"Google Chrome" --headless=new --enable-logging=stderr --virtual-time-budget=20000 --dump-dom http://localhost:8090/
```

`expo install --check` (11-23): "Dependencies are up to date". `expo-doctor` (11-23): "20/20 checks passed. No issues detected!".

`pnpm install --frozen-lockfile && pnpm verify` in a clean checkout: green. `pnpm verify` took 28 s here with a warm pnpm store; the PM's reviewer measured 161 s cold and 33 s warm (1,197 Vitest tests, 16 Jest tests).

## Shared packages on Hermes (asked for by the PM)

Read from the release builds, so this is Hermes bytecode with no dev server. Identical on iOS and Android:

| Check | Result |
|---|---|
| `runSharedFixtures()` from `@repo/quiz-engine/fixtures` (ENG-02) | `127 fixtures ran, 0 failed` |
| `localDateOf` from `@repo/game-rules` (ENG-03, ADR 0005) | `2026-01-01 2026-01-02 2026-06-16 2026-03-07 2026-03-08 2026-03-08 2026-03-09 2026-10-31 2026-11-01 2026-11-01 2026-11-02; unknown zone: RangeError; empty zone: RangeError` |
| `Intl.DateTimeFormat('en-US', { timeZone, year, month: '2-digit', day: '2-digit' })`, called directly | `Kathmandu 01/02/2026, Los Angeles 12/31/2025; Intl with an unknown zone: RangeError; with an empty zone: RangeError` |
| Regex literals with the `u` flag: `\p{L}`, `\p{M}`, `\p{Z}`, `\p{Cc}`, `\p{Cf}`, `\p{Cs}` | pass (each matches its sample and rejects `1`) |
| `Object.hasOwn`, `Array.prototype.at`, `'é'.normalize('NFD').length === 2` | pass |
| zod 4.6.7: `z.strictObject` and `z.discriminatedUnion` | pass (accepts the valid value, rejects an unknown key and an unknown discriminator) |

The eleven dates are, in order: Kathmandu at 18:14 and 18:15 UTC on 1 January, the minute on each side of its midnight, which only an offset of exactly +5:45 puts on two different days; Kiritimati (+14:00), ADR 0005's own example; then the minute before and the minute of local midnight in Los Angeles on each side of the 8 March and 1 November 2026 clock changes. They match Node 26.13.1 (`src/smoke/hermes-probes.test.ts` runs the same probes on Node).

What Hermes itself does with a bad zone, on both platforms: `new Intl.DateTimeFormat('en-US', { timeZone })` throws an error whose `name` is `RangeError` for `'Mars/Olympus_Mons'` and for `''`. It does not fall back to the device's zone for an empty string. Only the error's name was recorded, not its message.

One thing Hermes does not have: `Intl.PluralRules` (and `Intl.Locale`). The i18n row reads "PluralRules polyfilled" on both native platforms and "built in" on web.

## What a passing row does and doesn't prove

Every row proves the library is installed, bundled and loads without throwing; on iOS and Android that includes its native module registering. Most rows also make one call that goes through the library and report what came back. These don't:

| Row | What it does | Why |
|---|---|---|
| Expo Router with NativeTabs, `@expo/ui`, expo-symbols, Gesture Handler, react-native-svg, FlashList, expo-image | Imports it; the detail ends in "loaded" | Each is a component. One instance is rendered in the strip at the top of the screen, visible in the screenshots. |
| expo-web-browser on iOS and web | Imports it | Opening a browser needs a person to close it. On Android the row calls `getCustomTabsSupportingBrowsersAsync()`. |
| expo-video on web | Imports it | expo-video 58.0.14 has no web implementation of `isPictureInPictureSupported()`; the call throws there. iOS and Android make the call. |
| expo-dev-client | In a release build, imports it: "imported; not part of a release build" | The dev client's native module is left out of release builds and its calls throw. In a development build the row registers an empty dev-menu list; that path has not been run on the final code. |
| `@xstate/react`, `react-i18next` | Imports it | Their APIs are hooks and need a component. `xstate` and `i18next` themselves are called. |
| Sentry, PostHog, Better Auth, Google sign-in | Constructs the client or reads the native module; nothing is sent | No DSN, key, server or client id exists yet. |
| expo-updates | Reads `isEnabled` (`false`) and the runtime version | See "Not proven". |

Installed and with no row of their own, because another row or the app's own start-up goes through them: `expo-constants` (the Expo SDK row), `expo-status-bar` (rendered in the root layout), `react-native-screens` (under NativeTabs), `intl-messageformat` and the two `@formatjs` polyfills (under the i18n row), the TanStack persisters (under the TanStack row), `react-dom`, `react-native-web` and `@expo/metro-runtime` (the web build).

## Screenshots

| | Light, default text | Dark, largest text |
|---|---|---|
| iOS (release build) | [`ios-light.jpg`](ios-light.jpg) | [`ios-dark-largest.jpg`](ios-dark-largest.jpg) (`accessibility-extra-extra-extra-large`) |
| Android (release build) | [`android-light.jpg`](android-light.jpg) | [`android-dark-largest.jpg`](android-dark-largest.jpg) (font scale 2.0) |
| Web | [`web.jpg`](web.jpg) (480 px wide) | |

[`android-expo-observe-without-project-id.jpg`](android-expo-observe-without-project-id.jpg) is the failure ADR 0009 records.

## Android 16 KB page size

`apps/mobile/scripts/check-page-size.sh` runs the two checks Android's page-size guide gives: `zipalign -c -P 16 -v 4`, and the alignment of every `LOAD` segment in every 64-bit library (`llvm-objdump -p`, 2**14 or more).

On the arm64 release APK of `1df88b7`, full output in [`page-size-check.txt`](page-size-check.txt):

```
1681 entries OK
Verification successful

PASS: all 38 64-bit libraries are 16 KB aligned, and the APK is zip-aligned for 16 KB pages
```

On the all-ABI release APK of 2026-11-15 (before the merge; it adds the x86_64 libraries), full output in [`page-size-check-all-abis-2026-11-15.txt`](page-size-check-all-abis-2026-11-15.txt):

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
- **Four workarounds in the shell's code** (expo-image and `SafeAreaView` with Unistyles, NativeTabs on web, FlashList in Jest): ADR 0013.
- The web export prints 30 Metro warnings that `expo-router`'s `package.json` has an invalid `exports` configuration. The export succeeds and the page runs.

## Not proven

- A launch on a 16 KB-page device or emulator. It needs the image `system-images;android-36;google_apis_ps16k;arm64-v8a`, which is the owner's to install.
- A physical iPhone or Android phone.
- The development builds on the final code: both debug reports are from 2026-11-15, and expo-dev-client's dev-menu call has not run since the check was written.
- An x86_64 Android build of the final code (the all-ABI build is from 2026-11-15).
- **The fingerprint runtime version** (for FND-05b). `expo-updates` reports no runtime version in these builds: the row reads "runtime version not reported", because updates are disabled until the EAS half supplies a URL. Whether the fingerprint policy produces a value in a build with updates enabled is untested.
- Screen reader (VoiceOver, TalkBack) and Reduce Motion on the smoke screen. The rows carry accessibility labels and a Jest test asserts them, but no screen reader was run, and the pulsing dot was not checked with Reduce Motion on.
- Anything that needs an account: EAS Build, EAS Update, `expo-observe`, Sentry and PostHog reporting, sign-in with Apple or Google, push tokens.
- Gesture Handler beyond one pan gesture, and Skia beyond one canvas.
