# FND-05 (local half): build evidence

Collected on 2026-11-15 on one Mac (Apple silicon, macOS 27.2). Nothing here used an account, a key or a secret.

| | |
|---|---|
| Expo SDK, React Native, React | 58.0.25, 0.88.1, 19.3.0 |
| Node, pnpm | 26.13.1 (through pnpm's `devEngines`), 11.28.9 |
| Xcode, simulator | 26.6; iPhone 17 Pro, iOS 26.5 |
| JDK, Gradle, NDK | Homebrew OpenJDK 17.0.19; Gradle 9.4.1 (wrapper); NDK 27.1.12297006 |
| Android SDK, emulator | platform 37 and build-tools 37.0.0 (fetched by Gradle); `Medium_Phone_API_36`, arm64, 4 KB pages |
| Every resolved version | [`versions.md`](versions.md) |

## Result

| Build | Command | Result | Smoke report |
|---|---|---|---|
| iOS, debug | `expo run:ios` | `› Build Succeeded` | 40 pass, 0 fail, 0 skipped: [`smoke-ios-debug.txt`](smoke-ios-debug.txt) |
| Android, debug | `expo run:android --variant debug` | `BUILD SUCCESSFUL in 6m 19s` | 39 pass, 0 fail, 1 skipped: [`smoke-android-debug.txt`](smoke-android-debug.txt) |
| Android, release, all ABIs | `expo run:android --variant release` | `BUILD SUCCESSFUL in 12m 16s`, 187 MB APK | 16 KB check below |
| Android, release, arm64 | `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a` | `BUILD SUCCESSFUL in 38s` (incremental), 64 MB APK | 39 pass, 0 fail, 1 skipped, Metro stopped: [`smoke-android-release.txt`](smoke-android-release.txt) |
| Web | `pnpm --filter @repo/mobile web:export` | `Exported: dist` (server output) | 31 pass, 0 fail, 9 skipped, served with `expo serve`: [`smoke-web.txt`](smoke-web.txt) |

The one skip on Android is Sign in with Apple (iOS only). The nine on web are native-only libraries.

`expo install --check`: "Dependencies are up to date". `expo-doctor`: "20/20 checks passed. No issues detected!". `pnpm verify`: green (28 Vitest tests, 13 Jest tests).

## Screenshots

| | Light, default text | Dark, largest text |
|---|---|---|
| iOS (debug build) | [`ios-light.jpg`](ios-light.jpg) | [`ios-dark-largest.jpg`](ios-dark-largest.jpg) (`accessibility-extra-extra-extra-large`) |
| Android | [`android-light.jpg`](android-light.jpg) (release build, no Metro) | [`android-dark-largest.jpg`](android-dark-largest.jpg) (debug build, font scale 2.0) |
| Web | [`web.jpg`](web.jpg) (480 px wide) | |

[`android-expo-observe-without-project-id.jpg`](android-expo-observe-without-project-id.jpg) is the failure ADR 0009 records.

The reports are the app's own output: the placeholder screen runs one check per library and logs the result (`[smoke] …`). They were read from Metro's log (debug builds), `adb logcat -s ReactNativeJS` (release build) and the browser console (web).

## Android 16 KB page size

`apps/mobile/scripts/check-page-size.sh` runs the two checks Android's page-size guide gives: `zipalign -c -P 16 -v 4`, and the alignment of every `LOAD` segment in every 64-bit library (`llvm-objdump -p`, 2**14 or more).

On the all-ABI release APK, full output in [`page-size-check.txt`](page-size-check.txt):

```
== 1. zipalign -c -P 16 -v 4 ==
1795 entries OK
Verification successful

PASS: all 76 64-bit libraries are 16 KB aligned, and the APK is zip-aligned for 16 KB pages
```

The arm64-only APK that was launched passes the same check (38 libraries). The emulator itself has 4 KB pages (`adb shell getconf PAGE_SIZE` → `4096`), so nothing here ran on a 16 KB device: see "Not proven".

## Hermes probes (asked for by the PM for ENG-01, ENG-02 and ENG-03)

Same result on iOS (debug) and Android (debug and release), both on Hermes:

| Probe | Result |
|---|---|
| Regex literals with the `u` flag: `\p{L}`, `\p{M}`, `\p{Z}`, `\p{Cc}`, `\p{Cf}`, `\p{Cs}` | pass (each matches its sample and rejects `1`) |
| `Object.hasOwn` | pass |
| `Array.prototype.at` | pass |
| `'é'.normalize('NFD').length === 2` | pass |
| zod 4.6.7: `z.strictObject` and `z.discriminatedUnion` | pass (accepts the valid value, rejects an unknown key and an unknown discriminator) |
| `Intl.DateTimeFormat('en-US', { timeZone, year, month: '2-digit', day: '2-digit' })` | pass: `Kathmandu 01/02/2026, Los Angeles 12/31/2025` |

One thing Hermes does not have: `Intl.PluralRules` (and `Intl.Locale`). The i18n row reads "PluralRules polyfilled" on both native platforms and "built in" on web.

## Things the build commands did that the plan didn't expect

Each is either fixed in this pull request or recorded in an ADR.

- **`expo-observe` crashes Android at start-up without an EAS project id.** Removed (ADR 0009).
- **`expo run:ios` refuses to build for a simulator** when the app has the Sign in with Apple entitlement and the Mac has no signing certificate ("No code signing certificates are available to use"). The entitlement is stripped until the Apple account exists (ADR 0010).
- **A plain Gradle release build failed** at `:app:createBundleReleaseJsAndAssets` with "Cannot find module 'babel-preset-expo'". Under pnpm's isolated `node_modules` the app can only resolve its own dependencies, and `babel.config.js` names that preset. `expo run:android` hides this because Expo CLI bundles the JavaScript itself. EAS Build runs plain Gradle, so it would have failed there. Fixed by making `babel-preset-expo` a dev dependency of the app.
- **`expo run:android` builds and installs, then fails to launch**: it looks for `com.dailyquizshell` (derived from the slug) and not the configured `dev.dailyquiz.shell`. Launching by hand works: `adb shell am start -a android.intent.action.VIEW -d "dailyquiz://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"` after `adb reverse tcp:8081 tcp:8081`.
- **Installing on the emulator failed twice with `INSTALL_FAILED_INSUFFICIENT_STORAGE`**: the emulator's data partition had about 540 MB free. The debug APK installed after the old copy was removed; the 187 MB all-ABI release APK did not fit, which is why the launched release APK is arm64-only.
- **Gradle downloaded Android platform 37 and build-tools 37.0.0** into the SDK folder by itself.
- The first attempts lost about fifteen minutes to a network outage (Gradle's distribution download timed out twice; a CocoaPods download stalled). No code was involved.

## Not proven

- A launch on a 16 KB-page device or emulator. It needs the image `system-images;android-36;google_apis_ps16k;arm64-v8a`, which is the owner's to install.
- A physical iPhone or Android phone.
- An iOS release build. The iOS JavaScript was only run in the debug build.
- Anything that needs an account: EAS Build, EAS Update, `expo-observe`, Sentry and PostHog reporting, sign-in with Apple or Google, push tokens.
- Gesture Handler beyond one pan gesture, and Skia beyond one canvas.
