# 0076. The birth-year age screen stays; age assurance is a question for counsel

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D2, ONB-06, PRIV-01; roadmap §3.3 A11, O-7, §9 |

## Context

ONB-06 specifies a neutral birth-year screen, and the minimum age is 13 (D2). Since the spec was written, `expo-age-range` has appeared and new age-assurance laws for apps have been passed (roadmap §9). Whether a self-declared birth year is enough for a 13+ app with usernames is a legal question.

## Decision

The MVP builds the neutral birth-year screen as specified. Whether to add the platforms' age signals through `expo-age-range` stays open until counsel answers (O-7).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Adopt `expo-age-range` now | No requirement is established for our markets, which aren't chosen yet (O-5), and it adds a platform dependency to the first-launch path. |
| An identity or age-verification vendor | Out of proportion for a quiz with no free text (D8), and a privacy cost (PRIV-08). |
| No age screen | D2 sets a minimum age to keep the app out of child-privacy obligations. |

## Consequences

- BE-10 refuses a birth year under 13 and stores nothing about that player.
- DS-05 designs the age step so that a platform signal could replace it without reordering onboarding.
- Counsel's view is needed by M5 (O-7). Apple's new age-rating answers are due on 2027-01-12 (QA-03).
- If counsel requires age signals, that is a new ADR and a change to ONB-06.
