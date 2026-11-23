# FND-05: resolved versions

Generated on 2026-11-23 from `pnpm-lock.yaml` with `pnpm --filter @repo/mobile ls --depth 0 --json`. "Declared" is the range in `apps/mobile/package.json`; "Resolved" is what the lockfile installs. The release builds and the web export of 2026-11-23 were made from exactly these.

## What moved since the builds of 2026-11-15

Merge commit `2e9e7cc` brought `main` into the branch on 2026-11-23. Its lockfile was regenerated with `pnpm install` (on the PM's instruction, instead of resolving the conflict by hand), which let every range take its newest version. 18 direct dependencies moved, and two workspace packages were added afterwards (`@repo/game-rules`, `@repo/quiz-engine`).

The development builds of 2026-11-15 were made from the left-hand column, with two further differences: they bundled Better Auth 1.7.25 and i18next 27.1.2, which were replaced the same day because pnpm's minimum release age rejected them (ADR 0006).

| Package | 2026-11-15 | 2026-11-23 |
|---|---|---|
| `@expo/ui` | 58.0.28 | 58.0.29 |
| `@formatjs/intl-locale` | 5.4.3 | 5.5.0 |
| `@formatjs/intl-pluralrules` | 7.0.4 | 7.1.0 |
| `@sentry/react-native` | 8.28.0 | 8.28.1 |
| `@tanstack/query-async-storage-persister` | 5.107.1 | 5.108.2 |
| `@tanstack/react-query` | 5.107.1 | 5.108.2 |
| `@tanstack/react-query-persist-client` | 5.107.1 | 5.108.2 |
| `babel-preset-expo` | 58.0.25 | 58.0.26 |
| `expo` | 58.0.25 | 58.0.26 |
| `expo-dev-client` | 58.0.20 | 58.0.21 |
| `expo-file-system` | 58.0.13 | 58.0.14 |
| `expo-router` | 58.0.31 | 58.0.32 |
| `expo-web-browser` | 58.0.8 | 58.1.0 |
| `i18next` | 27.1.1 | 27.2.4 |
| `i18next-icu` | 2.7.0 | 2.7.1 |
| `intl-messageformat` | 12.1.5 | 12.2.0 |
| `jest-expo` | 58.0.14 | 58.0.15 |
| `react-i18next` | 18.0.1 | 18.0.3 |

`expo-web-browser` moved because Expo changed its pin; the rest moved inside their declared ranges. A package is held to one version only where "Declared" has no `^` or `~`; every other row is a range, and the next `pnpm install` that regenerates the lockfile may move it again.

## Dependencies

| Package | Declared | Resolved |
|---|---|---|
| `@better-auth/expo` | `1.7.23` | 1.7.23 |
| `@expo/metro-runtime` | `~58.0.17` | 58.0.17 |
| `@expo/ui` | `~58.0.28` | 58.0.29 |
| `@formatjs/intl-locale` | `^5.4.3` | 5.5.0 |
| `@formatjs/intl-pluralrules` | `^7.0.4` | 7.1.0 |
| `@react-native-google-signin/google-signin` | `17.0.0` | 17.0.0 |
| `@repo/game-rules` | `workspace:*` | workspace |
| `@repo/quiz-engine` | `workspace:*` | workspace |
| `@sentry/react-native` | `~8.28.0` | 8.28.1 |
| `@shopify/flash-list` | `2.3.2` | 2.3.2 |
| `@shopify/react-native-skia` | `2.14.0` | 2.14.0 |
| `@tanstack/query-async-storage-persister` | `^5.107.1` | 5.108.2 |
| `@tanstack/react-query` | `^5.107.1` | 5.108.2 |
| `@tanstack/react-query-persist-client` | `^5.107.1` | 5.108.2 |
| `@xstate/react` | `^6.1.0` | 6.1.0 |
| `better-auth` | `1.7.23` | 1.7.23 |
| `expo` | `~58.0.25` | 58.0.26 |
| `expo-apple-authentication` | `~58.0.3` | 58.0.3 |
| `expo-application` | `~58.1.2` | 58.1.2 |
| `expo-asset` | `~58.0.21` | 58.0.21 |
| `expo-audio` | `~58.0.12` | 58.0.12 |
| `expo-constants` | `~58.0.16` | 58.0.16 |
| `expo-crypto` | `~58.0.8` | 58.0.8 |
| `expo-dev-client` | `~58.0.20` | 58.0.21 |
| `expo-device` | `~58.0.5` | 58.0.5 |
| `expo-file-system` | `~58.0.13` | 58.0.14 |
| `expo-font` | `~58.0.12` | 58.0.12 |
| `expo-glass-effect` | `~58.0.5` | 58.0.5 |
| `expo-haptics` | `~58.0.8` | 58.0.8 |
| `expo-image` | `~58.0.18` | 58.0.18 |
| `expo-linking` | `~58.0.17` | 58.0.17 |
| `expo-localization` | `~58.0.5` | 58.0.5 |
| `expo-network` | `~58.0.5` | 58.0.5 |
| `expo-notifications` | `~58.1.9` | 58.1.9 |
| `expo-router` | `~58.0.31` | 58.0.32 |
| `expo-secure-store` | `~58.0.3` | 58.0.3 |
| `expo-sharing` | `~58.0.23` | 58.0.23 |
| `expo-splash-screen` | `~58.0.14` | 58.0.14 |
| `expo-status-bar` | `~58.0.5` | 58.0.5 |
| `expo-symbols` | `~58.0.5` | 58.0.5 |
| `expo-system-ui` | `~58.0.7` | 58.0.7 |
| `expo-updates` | `~58.0.22` | 58.0.22 |
| `expo-video` | `~58.0.14` | 58.0.14 |
| `expo-web-browser` | `~58.1.0` | 58.1.0 |
| `i18next` | `^27.1.1` | 27.2.4 |
| `i18next-icu` | `^2.7.0` | 2.7.1 |
| `intl-messageformat` | `^12.1.5` | 12.2.0 |
| `posthog-react-native` | `4.86.0` | 4.86.0 |
| `react` | `19.3.0` | 19.3.0 |
| `react-dom` | `19.3.0` | 19.3.0 |
| `react-i18next` | `^18.0.1` | 18.0.3 |
| `react-native` | `0.88.1` | 0.88.1 |
| `react-native-gesture-handler` | `~3.3.0` | 3.3.0 |
| `react-native-mmkv` | `4.3.2` | 4.3.2 |
| `react-native-nitro-modules` | `0.37.1` | 0.37.1 |
| `react-native-reanimated` | `4.7.1` | 4.7.1 |
| `react-native-safe-area-context` | `~5.11.1` | 5.11.1 |
| `react-native-screens` | `~4.30.1` | 4.30.1 |
| `react-native-svg` | `15.16.0` | 15.16.0 |
| `react-native-unistyles` | `3.8.1` | 3.8.1 |
| `react-native-web` | `^0.21.4` | 0.21.4 |
| `react-native-worklets` | `0.13.0` | 0.13.0 |
| `xstate` | `^5.33.4` | 5.33.4 |
| `zod` | `catalog:` | 4.6.7 |
| `zustand` | `^5.1.0` | 5.1.0 |

## Development dependencies

| Package | Declared | Resolved |
|---|---|---|
| `@jest/globals` | `^30.5.2` | 30.5.2 |
| `@react-native/jest-preset` | `0.88.1` | 0.88.1 |
| `@testing-library/react-native` | `^14.1.0` | 14.1.0 |
| `@types/react` | `~19.3.0` | 19.3.0 |
| `babel-preset-expo` | `~58.0.25` | 58.0.26 |
| `jest` | `^30.5.2` | 30.5.2 |
| `jest-expo` | `~58.0.14` | 58.0.15 |
| `test-renderer` | `^1.3.1` | 1.3.1 |
| `typescript` | `~6.0.3` | 6.0.3 |
