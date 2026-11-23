# 0044. expo-localization and i18next with ICU messages

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D11, L10N-01, L10N-02, L10N-03, L10N-09; roadmap §3.1 (i18n) |

## Context

Launch is in English (L10N-11), but D11 makes localization a foundation: every string is externalized in ICU message format from day one (L10N-01), and a pseudo-locale is used in QA (L10N-02). FND-05 resolved i18next 27.1.2, i18next-icu 2.7.0 and expo-localization 58.0.5.

## Decision

Interface strings are i18next 27 messages in ICU format. The device language comes from `expo-localization`. Numbers, dates and plurals are formatted with `Intl`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| i18next's own plural suffixes | L10N-01 asks for ICU, which translators' tools expect. |
| Another ICU library | The spec names i18next, and nothing found in FND-05 argues for leaving it. |
| English literals until V1 | Retrofitting is the expensive path D11 exists to avoid. |

## Consequences

- Hermes has no `Intl.PluralRules` or `Intl.Locale`. `@formatjs/intl-locale` and `@formatjs/intl-pluralrules` must load before i18next, or an ICU plural throws (ADR 0006).
- i18next 27 defaults `fallbackLng` to `false`; set it to `en`.
- Lint rejects literal strings in the app (FE-01).
- Shared packages return stable codes with English messages for authors and tools; the app translates by code (ADR 0008).
