# 0013. Workarounds the smoke shell carries

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-23 |
| **Ticket** | `FND-05` |
| **Requirements** | Roadmap §6, FND-05 ("any incompatibility has an ADR"); roadmap §3.1 |

## Context

Four things in `apps/mobile` are not what a reader would expect, because a library didn't behave as its place in the stack assumes. None stopped a build, so none has an ADR of its own. Each was seen on Expo SDK 58.0.26, React Native 0.88.1 and the versions in `docs/plans/FND-05-evidence/versions.md`, and each will meet FE-01 again.

## Decision

The shell keeps these four workarounds, and FE-01 replaces each with the fix named beside it.

| What | What was observed | The workaround here | The fix, and whose it is |
|---|---|---|---|
| `expo-image` on web | Given a Unistyles style, the image loaded and rendered at 0 × 0 pixels. Unistyles applies its styles to React Native's own components; `expo-image` is not one of them. On iOS and Android the same style gave it its size. | `render-strip.tsx` passes a plain style object (`imageStyle`). | FE-01 wraps third-party components with Unistyles' `withUnistyles`, once, in the design system. |
| NativeTabs on web | Expo Router's web fallback draws the tab bar as a floating pill over the top of the page, covering whatever is there. | `smoke-screen.tsx` adds 72 px of top padding on web. | FE-01 gives web its own layout (`_layout.web.tsx`), as Expo's template does. The share pages are not a tabbed app. |
| FlashList in Jest | A test that imports `@shopify/flash-list` 2.3.2 fails before it runs: "Must use import to load ES Module". The package ships ES modules, and `jest-expo` 58.0.15's default `transformIgnorePatterns` doesn't transform it. | No test renders FlashList. The results list is plain views; FlashList is rendered once in the strip and proven by the builds. | FE-01 adds the package to Jest's `transformIgnorePatterns` when the first tested component uses a list. Not tried here. |
| `SafeAreaView` and themes | A themed background on `SafeAreaView` (`react-native-safe-area-context`) kept the old theme's colour after a light/dark switch, for the same reason as the first row. | `smoke-screen.tsx` puts its styles on a React Native `View` and reads the insets from Unistyles' runtime. | The same `withUnistyles` rule in FE-01. |

One thing the review asked about is not a workaround any more. The app's `tsconfig.json` extends `expo/tsconfig.base`, not the repository's base, because Expo's sets the JSX, library and module options the app needs. It now also sets the base's `verbatimModuleSyntax` and `erasableSyntaxOnly`, with `noUncheckedIndexedAccess`, `noImplicitOverride` and `noFallthroughCasesInSwitch`; the app typechecks clean with all of them. `allowImportingTsExtensions` is on because the shared packages import each other with `.ts` extensions and the app typechecks their source.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Fix each one properly in this ticket | FND-05 proves the libraries build and load. A design-system wrapper, a web layout and the Jest transform list are FE-01's, and would be built here without the design tokens or the components they exist for. |
| Leave them as code comments | The ticket's done-when asks for an ADR per incompatibility, and a comment in a file FE-01 deletes is lost with it. |

## Consequences

- FE-01 starts with four known items and their fixes. If it finds `withUnistyles` doesn't cover a component, that is a new ADR.
- Until then, a themed or sized style on a third-party component is a bug waiting on web or on a theme change. Reviewers should look for it.
- The app's TypeScript options are copied from the base, not inherited. If the base gains a flag, the app's `tsconfig.json` needs it added by hand.
