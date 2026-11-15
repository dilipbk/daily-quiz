# @repo/mobile

The Expo app: iOS, Android and web. Until FE-01 it is an empty SDK 58 shell whose one screen is a smoke report: it renders each visual library once and runs one check per planned library (`src/smoke/`). What it proved, and on which versions, is in `docs/adr/0006-mobile-native-baseline-on-sdk-58.md` and `docs/plans/FND-05-evidence/`.

## Run it locally

No account, key or secret is needed. Run everything through pnpm so the workspace's Node version is used.

```bash
pnpm install                                  # from the repository root
cd apps/mobile

pnpm exec expo prebuild --clean               # generates ios/ and android/ (git-ignored, ADR 0007)
pnpm exec expo run:ios                        # boot a simulator first; don't pass --device
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
  pnpm exec expo run:android --variant debug  # start an emulator first
pnpm run web:export && pnpm exec expo serve   # web: export, then serve dist/
```

You need Xcode 26.4 or later with CocoaPods, and JDK 17 with the Android SDK (Gradle fetches the platform and build-tools it needs).

Known rough edges on Expo CLI 58.1.20:

- `expo run:android` builds and installs, then fails its own launch step. Start the dev server with `pnpm start`, then open the app by hand:
  `adb reverse tcp:8081 tcp:8081 && adb shell am start -a android.intent.action.VIEW -d "dailyquiz://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`.
- After changing `app.config.ts` or a native dependency, run `expo prebuild --clean` again.

## Checks

```bash
pnpm test                                     # Jest (jest-expo); also part of `pnpm verify` at the root
pnpm typecheck
scripts/check-page-size.sh android/app/build/outputs/apk/release/app-release.apk   # Android 16 KB page size
```

## Not wired yet

Everything that needs an account waits for the EAS half of FND-05: `eas.json`, the EAS project id, EAS Update, `expo-observe` (ADR 0009), the Sign in with Apple entitlement (ADR 0010), Sentry and PostHog keys, Google client ids, push credentials and the real bundle identifier. The identity in `app.config.ts` is a placeholder and must never be uploaded.
