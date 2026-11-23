# Quiz App: Product & Mobile App Specification

| | |
|---|---|
| **Version** | 1.1 |
| **Date** | 2026-11-23 |
| **Status** | Amended to roadmap v1.1 and the accepted ADRs in `docs/adr/`, for the owner's approval. Version 1.0 was dated 2026-09-27; Appendix D lists what changed. |
| **Scope** | The mobile app (iOS and Android), the web share and marketing pages, the API and the admin console, built together in one pnpm monorepo. The API's contract is §19. |
| **Replaces** | "Quiz App Brainstorming and Analysis" (PDF) |
| **Working title** | Decided in DS-01 with the owner, with a trademark check before any store upload (ADR 0077). Builds use a placeholder identifier until then. |

**Conventions**
- **must** = required for the phase. **should** = strongly recommended. **may** = optional.
- **Phases:** **P0** foundations, **MVP**, **V1**, **V2**, **V3** (see §22). The calendar for P0 and the MVP is `docs/roadmap.md` §5.
- Values marked *(tunable)* are served by remote config so they can change without a release. A change applies to quizzes that start after it arrives; a running or resumed quiz keeps the values it started with.
- Requirement IDs (for example `DLY-01`) are stable. Reference them in tickets, commits and tests.
- ADR numbers refer to `docs/adr/` in this repository. Where this spec and `docs/roadmap.md` disagree, the roadmap's §3.3 wins.

---

## Contents

1. [Decisions log](#1-decisions-log)
2. [Product summary](#2-product-summary)
3. [Goals, non-goals, success metrics](#3-goals-non-goals-success-metrics)
4. [Audience](#4-audience)
5. [Product principles](#5-product-principles)
6. [Core loop and retention system](#6-core-loop-and-retention-system)
7. [Feature requirements](#7-feature-requirements)
8. [Information architecture and navigation](#8-information-architecture-and-navigation)
9. [Key screen specifications](#9-key-screen-specifications)
10. [Quiz session engine](#10-quiz-session-engine)
11. [Content model](#11-content-model)
12. [Design system](#12-design-system)
13. [Accessibility](#13-accessibility)
14. [Localization](#14-localization)
15. [Performance and non-functional requirements](#15-performance-and-non-functional-requirements)
16. [Offline and sync](#16-offline-and-sync)
17. [Security, integrity, privacy and compliance](#17-security-integrity-privacy-and-compliance)
18. [App architecture and tech stack](#18-app-architecture-and-tech-stack)
19. [Backend contract](#19-backend-contract)
20. [Analytics and experimentation](#20-analytics-and-experimentation)
21. [Quality, testing and release](#21-quality-testing-and-release)
22. [Roadmap and phase gates](#22-roadmap-and-phase-gates)
23. [Risks and mitigations](#23-risks-and-mitigations)
24. [Out of scope](#24-out-of-scope)
25. [Open questions](#25-open-questions)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Corrections to the original brainstorm](#appendix-b-corrections-to-the-original-brainstorm)
- [Appendix C: Sources](#appendix-c-sources)
- [Appendix D: Changes in version 1.1](#appendix-d-changes-in-version-11)

---

## 1. Decisions log

| # | Decision | Rationale |
|---|---|---|
| D1 | **The audience is horizontal**: anyone curious, including students, cooks, scientists and trivia fans. | The owner wants broad appeal. The wedge is the **daily loop and format**, not a niche. |
| D2 | **Minimum age is 13+** at launch. | Avoids COPPA-level obligations and a kids mode while the social features take shape. |
| D3 | **Mobile first (iOS and Android) from one Expo codebase.** The web is limited to shareable quiz/challenge pages and marketing, plus an internal admin console (§7.14). There is no full web mirror and no separate Next.js app. | Expo Router covers web from the same codebase. A full web copy doubles the work for little retention gain. |
| D4 | **Start on Expo SDK 58** (amended in 1.1, ADR 0030). Version 1.0 said to start on SDK 57 and move to 58 once it was stable. | SDK 58 has been stable since 2026-10-15. It stabilizes NativeTabs and Router data loaders/SSR. |
| D5 | **The API is built now, in this monorepo** (TypeScript **Hono** plus **Postgres**), contract first: every endpoint is a zod schema in the shared **contracts** package before the API or the app implements it (amended in 1.1, ADR 0072). Version 1.0 made the backend a separate, later project. | Streaks, XP and results are server-authoritative, so the daily loop can't be trusted until the server exists. The app, the API and the fake server parse with the same schemas. Running costs start in Phase 0 (roadmap §8). |
| D6 | **Retention is the backbone of the product**: Global Daily, Daily 5, streaks, weekly leagues and async challenges. | The owner's top goal is daily return. |
| D7 | **Launch with curated content.** Private creator tools arrive in V1 and public user-generated content (UGC) in V2. | UGC needs moderation and an audience first. A horizontal audience makes creators important early. |
| D8 | **No DMs, forums or free-text chat.** Social features use challenges, preset emotes and reactions. | These carry the highest moderation cost and child-safety risk. |
| D9 | **Design approach: "brand in the content, native in the chrome"**, with a rich system of category colors. | Delivers rich color and a native feel at once. |
| D10 | **No interstitial or banner ads.** Revenue comes from a subscription plus coins, and **purchases never affect ranked outcomes**. | Protects smoothness and trust. |
| D11 | **Accessibility and localization are foundations built in the MVP**, not add-ons. | A broad audience makes both essential, and retrofitting them is expensive. |
| D12 | **Every mode that affects rank or rewards has a defined integrity tier** (§10.1). | Competition is worthless if the results can't be trusted. |
| D13 | **Extra time never earns extra points.** Extended time (A11Y-08) lengthens the clock, but the speed bonus is always measured against the Standard limit (§10.5). | Otherwise choosing ×2 would raise daily percentiles and win challenges. The setting should neither help nor hurt a score (owner, MVP-08, 2026-10-04). |

---

## 2. Product summary

**Vision.** Make learning something new every day as satisfying as a game, for anyone, on any topic.

**Positioning.** A daily knowledge habit for curious people:
- two minutes a day;
- rich interactive questions across every field;
- friendly competition;
- a visible map of what you know.

**Differentiators.** These are things we aim to do *better* than others, not things nobody else does.
1. **A daily ritual** designed like the best habit apps: a shared daily quiz, streaks, leagues and async challenges.
2. **Question formats for every field**: math and chemistry notation, code, images, audio, ordering, estimation and more.
3. **A premium feel**: native, fast and tactile (haptics, sound, motion), and colorful.
4. **Personal**: per-topic skill ratings, questions pitched at about 70% predicted success, and a Knowledge Map identity.
5. **Learning, not just scoring**: explanations, sources, and a mistakes deck with spaced repetition.

**What it is not:**
- a classroom presentation tool;
- a homework Q&A service;
- a social network.

---

## 3. Goals, non-goals, success metrics

### Goals
- **G1**: Build a daily habit.
- **G2**: Feel best-in-class: smooth, accessible, beautiful.
- **G3**: Content people can trust.
- **G4**: Sustainable monetization that doesn't degrade the experience.
- **G5**: Scale content through creators without scaling risk.

### Non-goals (for now)
- Real-time matchmaking around the clock at launch.
- Open social networking or messaging.
- Users under 13.
- Web feature parity.
- AR.

### Success metrics

All targets are initial hypotheses, to be revised after soft launch.

| Metric | Definition | Soft-launch gate | Long-term target |
|---|---|---|---|
| **North star: weekly active days** | Average days per week a weekly active user completes at least 1 quiz | ≥ 3.0 | ≥ 4.0 |
| D1 retention | % of new users active on day 1 | ≥ 35% | ≥ 45% |
| D7 retention | % active on day 7 | ≥ 15% | ≥ 25% |
| D30 retention | % active on day 30 | ≥ 8% (V1 gate) | ≥ 12% |
| Stickiness | DAU / MAU | ≥ 20% | ≥ 30% |
| Global Daily completion | Completions ÷ starts | ≥ 85% | ≥ 90% |
| Share rate | Shares ÷ Global Daily completions | ≥ 3% | ≥ 8% |
| Challenge virality | Challenges accepted ÷ challenges sent | ≥ 30% | ≥ 45% |
| Notification opt-in | % of users granting permission after the primer | ≥ 50% | ≥ 60% |
| Content accuracy | "Wrong answer" reports per 10k answers | < 5 | < 2 |
| Stability | Crash-free sessions | ≥ 99.5% | ≥ 99.8% |

---

## 4. Audience

The audience is horizontal. The personas below are **design checks**: every major feature should work for all of them.

| Persona | Context | Needs | Design implications |
|---|---|---|---|
| **Student** (13–24) | Short breaks, exam topics, classmates | Explanations, repetition, social comparison | Mistakes deck, challenges, streaks, Math & Science depth |
| **Home cook / chef** | Curious about food science and cuisines; thinks visually | Visual questions, practical knowledge | Image questions, depth in the Food domain, scan-a-recipe (V2) |
| **Scientist / professional** | Deep topics, specialist notation | Accuracy, sources, hard questions | Math/chemistry/code rendering, sources on every question, hard difficulty tiers |
| **Casual trivia fan** | Fun, quick, competitive | Speed, novelty, bragging rights | Global Daily, leagues, share cards |
| **Creator** (teacher, expert, club organizer), V1+ | Makes quizzes for a group | A fast editor, private sharing, stats | Mobile editor, private links, creator stats |
| **Accessibility-reliant user** (cross-cutting) | Screen reader, large text, motor or color-vision differences | Full access to every flow | §13 applies everywhere |

- **Age:** 13+.
- **Geography:** global. English at launch, with localization infrastructure in place from the MVP.

---

## 5. Product principles

These are tie-breakers, in priority order.

1. **Respect the user's time.** A meaningful session takes ≤ 3 minutes.
2. **Feedback is instant.** Every tap gets a visual and haptic response within 100 ms.
3. **Correctness over quantity.** A wrong "fact" costs more than a missing quiz.
4. **Accessible by default.** If a feature can't be accessible, it ships with an accessible alternative.
5. **Motivate, don't manipulate.** No energy or lives gates, no fake scarcity, no guilt-trip notifications.
6. **Brand in the content, native in the chrome.**
7. **Integrity where it matters.** Competitive results must be trustworthy.
8. **Performance is a feature.** Breaching a budget in §15 blocks a release.

---

## 6. Core loop and retention system

```
 ┌────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌───────────────────┐
 │  TRIGGER   │ ──▶ │  PLAY (2–3 min)  │ ──▶ │     REWARD       │ ──▶ │     INVEST        │
 │ reminder,  │     │ Global Daily or  │     │ reveal, XP,      │     │ league position,  │
 │ widget,    │     │ Daily 5,         │     │ streak +1,       │     │ mistakes deck,    │
 │ "your      │     │ challenge        │     │ celebration,     │     │ badges, friends,  │
 │ turn"      │     │                  │     │ share card       │     │ Knowledge Map     │
 └────────────┘     └──────────────────┘     └──────────────────┘     └───────────────────┘
        ▲                                                                       │
        └─────────────────────────── next day ─────────────────────────────────┘
```

### 6.1 Global Daily (`DLY`)

| ID | Requirement | Phase |
|---|---|---|
| DLY-01 | One Global Daily set per calendar date: 8 questions *(tunable)*, identical for every user, spanning ≥ 5 domains, ordered easy → hard (3 easy / 3 medium / 2 hard *(tunable)*). | MVP |
| DLY-02 | Unlocks at 00:00 in the user's local time zone. The set for date D is the same everywhere. | MVP |
| DLY-03 | One scored attempt per day. After completion, it may be replayed in practice mode with no XP. | MVP |
| DLY-04 | The Today card has four states: **available**; **in progress** (the answers so far and **Continue**, until the end of the daily's date; §10.6); **completed** (score, result grid, friends' results from V1); **next unlock** (countdown). | MVP |
| DLY-05 | Completion produces a spoiler-free share card: a branded **image** (score, result grid, category colors) and a **text** version (symbol grid plus link). | MVP |
| DLY-06 | After completion, show the global percentile (MVP) and friends' scores (V1). There is no global Daily leaderboard. | MVP / V1 |
| DLY-07 | Today's and tomorrow's sets are prefetched for offline play (§16). | MVP |
| DLY-08 | Global Daily uses only editorially reviewed questions: never unreviewed UGC, never unreviewed AI output. | MVP |

### 6.2 Daily 5 (`D5`)

| ID | Requirement | Phase |
|---|---|---|
| D5-01 | A personalized set of 5 questions: 3 from the user's interests and 2 from their mistakes deck (falling back to interests), chosen to target about 70% predicted success (§11.5). | MVP (interests only), V1 (with mistakes) |
| D5-02 | Completing either daily set counts toward the streak and the daily goal. | MVP |

### 6.3 Streaks (`STK`)

| ID | Requirement | Phase |
|---|---|---|
| STK-01 | The streak increments once per local calendar day when the user completes a qualifying session: either daily set, or any other session of ≥ 5 questions *(tunable)*, challenges included. A Practice replay never qualifies, and the score doesn't matter. | MVP |
| STK-02 | The server is authoritative for streak state. The client updates optimistically and reconciles. | MVP |
| STK-03 | The day boundary is the user's local time zone at the qualifying action: a session is credited to the calendar date in the device's IANA time zone at the instant it completes, and to nothing else. There is no limit on time-zone changes (ADR 0003). DST transitions must never break a streak. | MVP |
| STK-04 | **Streak freeze:** applied automatically on a missed day; hold up to 2 *(tunable)*. Earned at milestones, one per milestone *(tunable)* (MVP); bought with coins or included in Premium (V1). | MVP / V1 |
| STK-05 | **Streak repair:** within 48 h of a break, once per 30 days *(tunable)*, for coins or as a Premium perk. | V1 |
| STK-06 | Milestones (3, 7, 14, 30, 50, 100, 365 days) trigger a celebration and a badge. | MVP |
| STK-07 | A streak calendar screen shows history, freezes used, and current and best streak. | V1 |
| STK-08 | **Friend streaks:** two friends who both play on the same day keep a shared streak. | V2 |

**Streak rules** (ADR 0004; every number is *(tunable)*):
- **The day credited** is the local date when the session completes, not when it started (STK-03, OFF-04).
- **Freezes earned:** each milestone of STK-06 grants one. A grant while holding the maximum is lost. A new player holds none. After a break, the new streak's milestones grant again.
- **Freezes spent:** a freeze covers a missed day as soon as that day is over, and two held cover two days in a row. Freezes spent before a break stay spent.
- **A frozen day** keeps the streak alive and doesn't add to its count.
- **Late syncs:** the streak derives from the set of credited dates, so the order in which sessions arrive can't change it. If a missed day's session syncs later, the whole history is replayed with that day credited. The replay usually gives back the freeze that day had spent, but it can also change what followed, and the result can be lower than before.
- **Best streak** is the longest streak in the replay. The server stores it as a high-water mark that only rises, and a milestone already celebrated is never withdrawn.

### 6.4 XP, levels, daily goal (`XP`)

| ID | Requirement | Phase |
|---|---|---|
| XP-01 | XP is status: it is earned and never spent. Formula: 10 per completed session of any source + 2 per correct answer + 10 when every answer is correct *(tunable)*. Relaxed earns the same. | MVP |
| XP-02 | Levels follow an increasing XP curve: going from level L to L+1 costs 20 × L XP *(tunable)*, with no top level. Reaching a new level triggers a celebration. | MVP |
| XP-03 | The daily goal is user-selected (Casual / Regular / Serious = 20 / 50 / 100 XP *(tunable)*) and shown as a ring on Today. The ring counts all XP credited to the local day, whatever mode earned it. | MVP |
| XP-04 | XP from sessions still in the outbox adds at most 100 *(tunable)* to a local day in the app's optimistic total. The server's total replaces it once they are validated (§10.1). | MVP |

**XP rules** (ADR 0004):
- Reaching level L takes 20 × L × (L − 1) / 2 XP. Level 2 arrives at 20 XP (a first Global Daily with five right), level 5 at 200, level 10 at 900 and level 20 at 3,800.
- **Practice:** a replayed daily earns none (DLY-03). Any other Practice replay earns half the formula, rounded down *(tunable)* (PLAY-02).

### 6.5 Weekly leagues (`LGE`)

| ID | Requirement | Phase |
|---|---|---|
| LGE-01 | A user joins a cohort of up to 30 *(tunable)* when they earn their first XP of the week. Cohorts group similar XP levels and nearby time zones. | V1 |
| LGE-02 | 10 tiers *(tunable)*. The top 5 promote and the bottom 5 demote *(tunable)*. The top tier can't promote and the bottom tier can't demote. | V1 |
| LGE-03 | The week ends on Sunday evening in the cohort's reference time zone. The outcome screen shows on the next app open. | V1 |
| LGE-04 | The league table shows promotion and demotion zones, time remaining and the user's rank. It refreshes on focus, on pull-to-refresh, and by light polling while visible. | V1 |
| LGE-05 | Leagues rank by XP only. Purchases never grant XP. | V1 |

### 6.6 Async challenges and ghosts (`CHL`)

| ID | Requirement | Phase |
|---|---|---|
| CHL-01 | **Async 1v1:** the user plays a quiz, then sends a link or code. The recipient plays the same questions, and both see a comparison: score, time, and results per question. | MVP |
| CHL-02 | Challenge links are **universal links**. They open the app if it is installed; otherwise a web share page with an install call-to-action. **Deferred deep linking** returns the user to the challenge after install. | MVP (links), V1 (deferred) |
| CHL-03 | Pending challenges appear in a "Your turn" inbox on Today and in Compete. Challenges expire after 72 h *(tunable)*. | MVP |
| CHL-04 | **Ghost race:** during a challenge, the opponent's recorded per-question timings show as a live progress marker. An optional "race a ghost" mode uses recorded runs from real players. | V1 |
| CHL-05 | "Rematch" and "Challenge back" each take one tap. | MVP |
| CHL-06 | Preset emote reactions on results. No free text. | V1 |

### 6.7 Badges and seasons (`BDG`)

| ID | Requirement | Phase |
|---|---|---|
| BDG-01 | Badges for streak milestones, perfect scores, topic mastery and challenges won. The MVP ships a core set of about 15. | MVP |
| BDG-02 | Monthly themed seasons with limited badges and themed collections. | V1 |

### 6.8 Mistakes deck (`MST`)

| ID | Requirement | Phase |
|---|---|---|
| MST-01 | Every incorrectly answered question enters the user's mistakes deck. | V1 |
| MST-02 | Questions resurface on a spaced-repetition schedule: SM-2 at first, with FSRS as a later upgrade. | V1 |
| MST-03 | The mistakes deck feeds Daily 5 (D5-01) and a dedicated "Review mistakes" session. | V1 |

### 6.9 Live events (`LIVE`)

| ID | Requirement | Phase |
|---|---|---|
| LIVE-01 | Live events run at fixed times (for example weekly) and are announced in the app with a countdown and a reminder opt-in. | V2 |
| LIVE-02 | A lobby shows the participant count and a countdown. Every player sees each question at the same moment. Timing and scoring happen on the server (integrity Tier A). | V2 |
| LIVE-03 | Between questions: the live answer distribution and the top-10 standings. | V2 |
| LIVE-04 | A Live Activity and the Dynamic Island show the countdown and the user's current rank. | V2 |
| LIVE-05 | Reconnection is graceful: the player rejoins within the current question when possible, and an answer is never double-counted. | V2 |
| LIVE-06 | Real-time 1v1 matchmaking arrives only once concurrency supports a match in under 10 s. Until then, ghosts fill the opponent slot. | V3 |

---

## 7. Feature requirements

### 7.1 Onboarding and accounts (`ONB`)

| ID | Requirement | Phase |
|---|---|---|
| ONB-01 | The first-launch flow runs in this order: 1. welcome (one-sentence value plus mascot) 2. age screen 3. pick ≥ 3 interests (colored category chips) 4. first quiz (5 easy questions) 5. celebration 6. notification primer 7. optional account. **The first question must be on screen within 30 s of first launch.** | MVP |
| ONB-02 | **Guest mode:** every core feature works without an account. Progress is stored on a server-side guest account. | MVP |
| ONB-03 | Account prompts appear at moments of value (second streak day, first challenge, first badge), framed as "Save your progress". | MVP |
| ONB-04 | Sign-in options: Sign in with Apple, Google, and email (magic link). Passkeys arrive in V1. | MVP |
| ONB-05 | Upgrading a guest to an account keeps all progress. | MVP |
| ONB-06 | A neutral age screen (birth year) appears in onboarding. Users under 13 can't proceed. | MVP |
| ONB-07 | Every player starts with a generated username. Choosing one includes an availability check and a content filter (ADR 0062). A basic avatar builder is included. | MVP |
| ONB-08 | Signing in on a new device restores streak, XP, settings and badges. | MVP |
| ONB-09 | **Account deletion is available in the app** (Settings), with confirmation and a clear statement of consequences. | MVP |

ONB-06 is unchanged in 1.1 (ADR 0076). The open question is for counsel: whether a self-declared birth year is enough for a 13+ app with usernames under the new age-assurance laws for apps, or whether the platforms' age signals (`expo-age-range`) must be added (Q10, roadmap O-7).

### 7.2 Explore and discovery (`EXP`)

| ID | Requirement | Phase |
|---|---|---|
| EXP-01 | The Explore tab contains a native header search bar, interest chips, a category grid (category colors and illustrations) and curated collections ("5-minute quizzes", "New this week", "Trending"). | MVP |
| EXP-02 | Browsing goes domain → topic → quiz list. Topic pages show quizzes, difficulty, and the user's level in that topic (V1). | MVP |
| EXP-03 | Search covers quizzes and topics (creators from V2). It tolerates typos, keeps recent searches, and suggests topics when there are no results. | MVP |
| EXP-04 | Filters use chips or a sheet (duration, difficulty, question types, language). **Never dropdowns.** | MVP |
| EXP-05 | Lists are virtualized and scroll infinitely with cursor pagination. Skeletons show while loading. | MVP |
| EXP-06 | Ranking weighs interests, topic ratings, freshness, popularity and quality score, and always includes about 20% exploration outside the user's interests *(tunable)*. Rule-based first; embeddings in V2. | MVP / V2 |
| EXP-07 | Quiz cards support iOS link previews: long-press shows a preview and a menu (Play, Challenge, Save, Share). | V1 |
| EXP-08 | Users can save quizzes to a "Saved" list. | V1 |

### 7.3 Quiz detail and play modes (`PLAY`)

| ID | Requirement | Phase |
|---|---|---|
| PLAY-01 | Quiz detail shows title, cover, domain/topic, question count, estimated duration, difficulty, question types, creator and rating. Primary action: **Play**. Secondary: **Challenge a friend**. | MVP |
| PLAY-02 | Play modes: **Standard** (timed, the default), **Relaxed** (untimed, no speed bonus, full XP) and **Practice** (a replay of a completed quiz: half XP, rounded down *(tunable)*; a replayed daily earns none, DLY-03). | MVP |
| PLAY-03 | Sessions follow §10: state machine, timing, interruption handling and scoring. | MVP |
| PLAY-04 | Lifelines (50/50, skip, +10 s) work in casual modes only. They are disabled in dailies, challenges and live events. | V1 |
| PLAY-05 | A question can be reported from its explanation step (wrong answer, unclear, offensive, other). | MVP |
| PLAY-06 | Every question has an explanation: why the answer is right, plus source link(s). | MVP |
| PLAY-07 | Leaving mid-quiz asks for confirmation. Progress in non-competitive modes is kept for resuming. The Global Daily counts as non-competitive here: leaving keeps the attempt until the end of its date (§10.6). | MVP |

### 7.4 Question types (`QT`)

| Type | Description | Phase |
|---|---|---|
| `single_choice` | 2–4 text options, one correct | MVP |
| `true_false` | Two options | MVP |
| `image_choice` | 2–4 image options in a 2×2 grid | MVP |
| `type_answer` | Free text, normalized, with aliases and a numeric tolerance | MVP |
| `ordering` | Arrange 3–6 items into the correct order | MVP |
| `multi_select` | Select all correct options | V1 |
| `matching` | Match 3–5 pairs | V1 |
| `slider_estimate` | Estimate a number; points scale with closeness | V1 |
| `fill_blank` | Fill blanks from word choices | V1 |
| `audio_prompt` | Audio in the question, with any answer format | V1 |
| `map_pin` | Drop a pin on a map; points scale with distance | V2 |
| `picture_reveal` | An image un-blurs over time; answering earlier scores more | V2 |
| `odd_one_out` | Pick the item that doesn't belong | V2 |
| `image_hotspot` | Tap the correct region of an image | V2 |

| ID | Requirement | Phase |
|---|---|---|
| QT-01 | Each question type is a **registry module** containing: schema (zod), renderer, **grader** (a pure function shared with the server), accessibility behavior, editor form and analytics payload. Adding a type requires **no change** to the session engine. | MVP |
| QT-02 | Graders are deterministic. They are unit-tested against shared fixtures that the app and the server both run. | MVP |
| QT-03 | `type_answer` normalization handles case, diacritics, whitespace, punctuation, leading articles (locale-aware), accepted aliases and numeric tolerance. A typed answer is exact by default: it forgives no typo unless the question's author switches tolerance on for that question. Where it is on, the number of typos allowed scales with the answer's length *(tunable)*, and a number is never forgiven one (`docs/content/editorial-guidelines.md`, EG-33 to EG-36). | MVP |
| QT-04 | Every type supports rich content blocks (§11.3) in the prompt, the options and the explanation. | MVP |
| QT-05 | Every type can be operated with a hardware keyboard (tablets and web) and with a screen reader. | MVP |

### 7.5 Results and review (`RES`)

| ID | Requirement | Phase |
|---|---|---|
| RES-01 | The results sequence runs in this order: 1. celebration (scaled to performance; reduced under Reduce Motion) 2. score and accuracy 3. XP bar fill 4. streak update 5. league change (V1) 6. badges earned 7. actions. | MVP |
| RES-02 | Actions: **Next quiz** (primary, to keep momentum), Review answers, Share, Challenge a friend. | MVP |
| RES-03 | The review shows every question with the user's answer, the correct answer, the explanation, sources and a Report option. | MVP |
| RES-04 | The store review prompt appears only after positive moments (7-day streak, perfect score) and respects platform limits. | V1 |
| RES-05 | If results are waiting to sync, show a subtle pending indicator, on the results and on Today's daily card (OFF-03). Never block the user. | MVP |

### 7.6 Profile and stats (`PRF`)

| ID | Requirement | Phase |
|---|---|---|
| PRF-01 | The profile shows avatar, username, level, current and best streak, quizzes played, accuracy and badges. | MVP |
| PRF-02 | Per-topic levels, derived from topic ratings. | V1 |
| PRF-03 | **Knowledge Map:** a visualization of mastery across domains, shareable as an image. | V2 |
| PRF-04 | Viewing another user's profile respects their privacy settings and offers Block and Report. | V1 |
| PRF-05 | Avatar builder: basic in the MVP, with earnable and purchasable cosmetics in V1. | MVP / V1 |

### 7.7 Social (`SOC`)

| ID | Requirement | Phase |
|---|---|---|
| SOC-01 | Add friends by invite link, QR code or username search. **No contact upload.** | V1 |
| SOC-02 | Friends activity: recent daily results, streaks and challenges. | V1 |
| SOC-03 | **Block user:** a blocked user can't challenge you, view your profile, or appear in your lists. Required from the MVP because challenges expose usernames. | MVP |
| SOC-04 | No DMs, forums or free-text chat. Users interact through challenges, preset emotes and reactions. | All phases until reviewed |
| SOC-05 | **Groups** (private clubs or classrooms): a shared leaderboard, group quizzes and invite links. | V2 |

### 7.8 Creator tools (`CRT`)

| ID | Requirement | Phase |
|---|---|---|
| CRT-01 | Create **private** quizzes on mobile with the MVP question types, and share them by link or code (unlisted). | V1 |
| CRT-02 | The editor autosaves drafts on the device and supports reordering, duplicating, preview-as-player, and inline validation errors. | V1 |
| CRT-03 | Media: pick or capture an image, crop and compress it before upload. **Alt text is required** on images and **a transcript is required** on audio. | V1 |
| CRT-04 | AI assist suggests wrong answers, explanations and difficulty. The creator must confirm each suggestion. | V2 |
| CRT-05 | Import pasted text or CSV into a draft quiz. | V2 |
| CRT-06 | **Scan-to-quiz:** photograph notes, a recipe or a textbook page; AI drafts a quiz, and the creator edits it. | V2 |
| CRT-07 | **Public publishing:** automated moderation plus human review before a quiz is listed publicly. Creator reputation adjusts how deep the review goes. | V2 |
| CRT-08 | Creator stats: plays, completion, average score, correctness per question and reports. | V2 |
| CRT-09 | A "Verified creator" badge for experts and educators. | V2 |
| CRT-10 | A web editor for power creators. | V3 |

### 7.9 Notifications and platform surfaces (`NTF`)

| ID | Requirement | Phase |
|---|---|---|
| NTF-01 | Notification permission is requested **only after the first completed quiz**, preceded by an in-app primer that explains the benefit. If the user declines, re-offer at a relevant moment at most once every 30 days. | MVP |
| NTF-02 | Android channels and iOS categories: Streak reminders, Challenges, Friends, Events, and Product news (off by default). Each can be switched on or off in Settings. | MVP |
| NTF-03 | **Streak reminder:** a *local* notification at the user's typical play time, sent only if they haven't played that day. Max 1 per day, and cancelled once they play. | MVP |
| NTF-04 | Quiet hours default to 22:00–08:00 local time and can be changed by the user. | MVP |
| NTF-05 | Notifications with actions ("Play now", "Accept challenge") deep-link straight into the session. | MVP |
| NTF-06 | An in-app notifications inbox. | V1 |
| NTF-07 | **iOS widgets** (`expo-widgets`): a small widget showing the streak and today's status; a medium widget showing the question of the day (answerable in the widget if interactivity is supported, otherwise a tap opens the app). | V1 |
| NTF-08 | Android widgets, once `expo-widgets` Android support is stable (SDK 58+). | V1 / V2 |
| NTF-09 | Live Activities for live events and time-limited challenges. | V2 |
| NTF-10 | App icon shortcuts: Global Daily, Continue, Challenge a friend. | V1 |
| NTF-11 | **iOS App Clip:** open a challenge link and play it without installing. | V2 |

### 7.10 Monetization and economy (`MON`)

| ID | Requirement | Phase |
|---|---|---|
| MON-01 | Two currencies. **XP** is status and never spent. **Coins** are earned or bought, and spent on cosmetics, lifelines, and streak freezes and repairs. The MVP has XP only. | V1 |
| MON-02 | An **economy sheet** documents every coin source and sink, with rates, before coins launch. All rates are tunable. | V1 |
| MON-03 | **Premium** subscription (monthly or annual, with a free trial) includes: extra freezes, streak repair, offline packs, advanced stats and Knowledge Map insights, and exclusive cosmetics. | V1 |
| MON-04 | **Purchases never affect ranked, league or live outcomes.** | Always |
| MON-05 | In-app purchases go through StoreKit and Play Billing via RevenueCat, with restore purchases and entitlements cached for offline use. | V1 |
| MON-06 | Regional pricing through store price tiers. | V1 |
| MON-07 | No paywall during a user's first 3 days. After that, paywalls appear only at feature gates, in context. | V1 |
| MON-08 | No interstitial or banner ads. Opt-in rewarded ads may be evaluated in V2, subject to a privacy and UX review. | n/a |

### 7.11 Settings (`SET`)

| Group | Contents | Phase |
|---|---|---|
| Account | Username, avatar, email, linked sign-in providers, sign out | MVP |
| Play | Default mode; timer (Standard, Extended ×1.5, Extended ×2, Untimed); auto-advance (off by default) | MVP |
| Notifications | Per-channel toggles, quiet hours, reminder time | MVP |
| Accessibility | Dyslexia-friendly font, high contrast, Reduce Motion override, larger answer buttons | MVP |
| Sound and haptics | Sound effects, music, volume, haptics | MVP |
| Language | App language; content languages (multiple allowed) | MVP (structure), V1 (options) |
| Privacy | Profile visibility, analytics consent, data export (V1), **delete account** | MVP |
| Blocked users | List and unblock | MVP |
| Subscription | Manage, restore | V1 |
| Help | FAQ, contact support, community guidelines, report a problem | MVP |
| About | Version, build, OTA update ID, licenses, terms, privacy policy | MVP |

### 7.12 Trust and safety (`SAFE`)

| ID | Requirement | Phase |
|---|---|---|
| SAFE-01 | A Report option on every quiz, question and user profile, with categories and an optional note (the note itself is moderated). | MVP |
| SAFE-02 | Blocking users (SOC-03). | MVP |
| SAFE-03 | Usernames, quiz titles and all user text are filtered before anyone else sees them: a word list plus AI moderation on the server. | MVP |
| SAFE-04 | A support contact is published in the app and on the store listing. | MVP |
| SAFE-05 | Reports are acknowledged in the app. Target response time: ≤ 48 h. | MVP |
| SAFE-06 | Community guidelines are available in the app and must be accepted before creating content. | V1 |
| SAFE-07 | **Accuracy pipeline:** every curated or AI-drafted question records its source(s), reviewer and status. A high report rate automatically suspends the question pending review. | MVP |
| SAFE-08 | Public UGC requires moderation (CRT-07). | V2 |

### 7.13 Web surfaces (`WEB`)

| ID | Requirement | Phase |
|---|---|---|
| WEB-01 | Quiz and challenge **share pages**: server-rendered with an Open Graph image, a preview and an install call-to-action, and serving as the universal-link fallback. Built with Expo Router web. | MVP |
| WEB-02 | **Play in the browser** on share pages (MVP question types) for recipients who don't have the app. | V1 |
| WEB-03 | Marketing landing page and legal pages (privacy, terms, guidelines, support). | MVP |
| WEB-04 | Full feature parity with the app on the web is out of scope. | n/a |

### 7.14 Admin console (`ADM`)

The admin console is `apps/admin`: a React Admin single-page app on the same API, built in this monorepo beside the app (ADR 0068).

| ID | Requirement | Phase |
|---|---|---|
| ADM-01 | Question bank CMS: create, edit, review and publish; sources, taxonomy, translations and versioning. | MVP (minimal internal tool) |
| ADM-02 | Scheduler for daily sets, with previews 14 days ahead. | MVP |
| ADM-03 | Moderation queue: reports (MVP), UGC review (V2), and user actions (warn, suspend, ban). | MVP / V2 |
| ADM-04 | Remote config and feature flags (PostHog may cover this). | MVP |
| ADM-05 | Push and in-app campaigns. | V1 |
| ADM-06 | Live event control room. | V2 |

---

## 8. Information architecture and navigation

### 8.1 Tabs (NativeTabs)

| Tab | Purpose | MVP contents | Added later |
|---|---|---|---|
| **Today** | The daily ritual | Streak, daily goal, Global Daily, Daily 5, "Your turn" challenges, continue | League mini-status (V1), events (V2) |
| **Explore** | Find something to play | Search, interests, categories, collections | Saved (V1), creators (V2) |
| **Compete** | Play against others | Challenges inbox and history | League, friends (V1); live events, groups (V2) |
| **Profile** | Identity and progress | Stats, badges, settings | Mistakes, streak calendar, creator section (V1); Knowledge Map (V2) |

"Create" starts inside Profile (V1). It becomes its own tab only if public UGC turns into a core pillar (decided at V2).

### 8.2 Presentation rules

| Pattern | Use for |
|---|---|
| **Push** (native stack) | Drill-downs: domain → topic → quiz detail |
| **Full-screen modal** | Quiz sessions and live events. No tab bar; swipe-to-dismiss is disabled and exit asks for confirmation. |
| **Form sheet** (with detents) | Filters, report, share options, lifeline info, quick settings |
| **Native menu** | Overflow actions (…), sort |
| **Alert** | Destructive confirmations only |

### 8.3 Route map (Expo Router, `src/app`)

```
src/app/
├── _layout.tsx                     # root: providers, theme, fonts, splash, auth bootstrap
├── +not-found.tsx
├── (onboarding)/
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── age.tsx
│   ├── interests.tsx
│   ├── first-quiz.tsx
│   ├── notifications.tsx           # permission primer
│   └── account.tsx                 # optional sign-in
├── (tabs)/
│   ├── _layout.tsx                 # NativeTabs
│   ├── (today)/index.tsx
│   ├── (explore)/
│   │   ├── index.tsx
│   │   ├── domain/[slug].tsx
│   │   ├── topic/[slug].tsx
│   │   └── collection/[slug].tsx
│   ├── (compete)/
│   │   ├── index.tsx               # challenges (MVP), league summary (V1)
│   │   ├── league.tsx              # V1
│   │   └── friends.tsx             # V1
│   └── (profile)/
│       ├── index.tsx
│       ├── badges.tsx
│       ├── streak.tsx              # V1
│       ├── mistakes.tsx            # V1
│       └── stats.tsx
├── quiz/[quizId].tsx               # quiz detail; use shared routes so each tab keeps its own stack
├── play/[sessionId].tsx            # session (fullScreenModal)
├── results/[sessionId].tsx
├── review/[sessionId].tsx
├── challenge/[code].tsx            # universal-link landing
├── user/[username].tsx             # V1
├── create/…                        # V1
├── live/[eventId]/…                # V2
├── settings/                       # pushed over the tabs from Profile's gear (§9.6)
│   ├── index.tsx                   # Settings (§7.11)
│   ├── timer.tsx                   # question timer picker (A11Y-08)
│   └── …
├── timer.tsx                       # formSheet: the quick timer picker, from the daily
├── report.tsx                      # formSheet
├── paywall.tsx                     # V1
└── store.tsx                       # V1
```

**Session abstraction.** Every playable thing (a quiz, the Global Daily, Daily 5, a challenge, the mistakes review, a live event) creates a **session** from a *source*. One screen, `play/[sessionId]`, renders them all.

---

## 9. Key screen specifications

### 9.1 Today

Modules are ordered by urgency. Modules with nothing to show collapse.

1. **Header:** streak flame and count, coins (V1), avatar.
2. **"Your turn":** challenges waiting on the user.
3. **Global Daily card:** in one of the DLY-04 states.
4. **Daily 5 card.**
5. **Daily goal ring.**
6. **Continue:** resume an interrupted session other than the Global Daily, such as an Explore quiz or the Daily 5. An unfinished Global Daily shows as Continue on its own card instead (DLY-04).
7. **League mini-status** (V1) and **event banner** (V2).

### 9.2 Quiz session

```
┌─────────────────────────────────────┐
│ ✕    ▰▰▰▰▱▱▱▱     ⏱ 12     ★ 340    │  top bar: exit, progress, timer, points
├─────────────────────────────────────┤
│  [category tint]                    │
│  (media: image / math / code)       │  question zone (~45%)
│  Question text …                    │  scrolls if the question is long
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ A   Answer one                  │ │
│ ├─────────────────────────────────┤ │  answer zone (~55%)
│ │ B   Answer two                  │ │  within thumb reach, pinned in place
│ ├─────────────────────────────────┤ │  answer buttons ≥ 56 pt tall
│ │ C   Answer three                │ │
│ ├─────────────────────────────────┤ │
│ │ D   Answer four                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- **Timer** (timed modes): the ring in the top bar shows the seconds; a full-width bar under the top bar burns down
  with it, and both turn to the warning color in the last 5 s. A 3-2-1 intro covers the first question (§10.2).
- **Result card:** after the reveal, the explanation card replaces the answers and **Next** is pinned under it. A long
  card scrolls above Next and never pushes it off the screen (A11Y-03).
- **Tablet, landscape:** the question zone sits on the left and the answer zone on the right.
- **Keyboard:** keys 1–4 select, Enter submits or advances, Esc opens the exit confirmation.
- **Category theming:** the screen takes the quiz's category tint. Correct/incorrect states override the tint.

### 9.3 Results
As specified in RES-01 and RES-02. The primary button is **Next quiz**.

### 9.4 Explore
As specified in EXP-01 to EXP-06. The category grid uses each category's color and illustration.

### 9.5 Compete
- **Challenges:** incoming, outgoing and history.
- **League** (V1): the table plus time remaining.
- **Friends** (V1).
- **Live events** (V2).

### 9.6 Profile
- **Identity:** avatar, username, level.
- **Stats** and a **badge shelf**.
- **Entries to:** mistakes, streak calendar, creator tools and settings.

---

## 10. Quiz session engine

### 10.1 Sources and integrity tiers

| Source | Grading | Tier | Playable offline |
|---|---|---|---|
| Standard or Relaxed quiz, Practice | On device | B | Yes |
| Global Daily, Daily 5 | On device, validated by the server | B | Yes (prefetched) |
| Async challenge | On device, validated by the server | B | Play offline, send when online |
| Live event (V2), real-time 1v1 (V3) | **Server** | **A** | No |

- **Tier A:** answer keys are **never** sent to the device before an answer is submitted. The server controls timing, and each answer is submitted individually.
- **Tier B:**
  - Answer keys are on the device: in the session payload, or for the Global Daily in its body, which every player of a date shares (§19.3).
  - On completion the server re-grades every answer with the shared engine against the session's question snapshot. Its result is authoritative; the app's is optimistic (roadmap §4.3).
  - The server also checks plausibility: answer-time distributions, impossible speeds, suspicious perfect-score patterns.
  - Offline XP is capped per day until the server validates it (XP-04).
- **V2:** device attestation (Apple App Attest or Google Play Integrity) is required for Tier A submissions.

### 10.2 State machine

The session is an explicit state machine (XState v5). It is independent of the UI. Sounds, haptics, animations and analytics hook into transitions, never into scattered component effects.

| State | Meaning | Exits |
|---|---|---|
| `loading` | Fetch or restore the session and preload the first question's assets | `LOADED` → `intro`, `FAILED` → `error` |
| `intro` | Optional 3-2-1 countdown (timed modes) | After 3 s *(tunable)* → `presenting` |
| `presenting` | Question visible, input enabled, timer running if timed | `SUBMIT` → `locked`, `TIMEOUT` → `locked` (no answer) |
| `locked` | Input disabled; grading (on device instantly, or awaiting the server in Tier A); lasts at least 150 ms | `GRADED` → `revealing` |
| `revealing` | Correct/incorrect feedback: animation, haptic, sound (~600 ms) | `DONE` → `explaining` |
| `explaining` | Explanation, sources and the report option are visible | `NEXT` → `presenting` (next question) or `finishing` |
| `finishing` | Compute the summary; submit, or queue if offline | `OK` or `QUEUED` → `results` |
| `paused` | App in the background (practice and Relaxed pause the timer) | `RESUME` → previous state |
| `reconnecting` | Tier A only: connection lost | `RESYNCED` → server-dictated state |
| `abandoned` | User confirmed exit | Terminal |

These events apply in every state:
- `BACKGROUND` / `FOREGROUND`
- `NETWORK_LOST` / `NETWORK_BACK`
- `QUIT_REQUESTED`

### 10.3 Timing rules

- **Default time per question** *(tunable)*:
  - 20 s for choice types;
  - 30 s for `type_answer`, `ordering` and `matching`;
  - +10 s when the question contains media or math.
- **Extended time** (×1.5 or ×2) and **Untimed** are available in Settings (A11Y-08). Extended time doesn't raise the speed bonus, which is always measured against the Standard limit (§10.5, D13). Untimed disables the speed bonus only.
- **Warnings:** a visual warning in the last 5 s, and one light haptic per second in the last 3 s.
- **The session machine owns the deadline; the UI thread draws it** (ADRs 0035 and 0037). While a timed question is shown, the
  machine keeps one timer per moment (the warning, each tick, the timeout). The ring and bar animate a Reanimated
  shared value on the UI thread. React must not re-render on every tick; the one exception is the timer's accessible
  value while a screen reader runs.
- **Backgrounding:** Standard, Relaxed and Practice sessions pause. Tier B dailies and challenges pause and log the pause time for plausibility checks. Tier A keeps running on the server's clock. Time while the app is closed counts the same way: a restored session pauses as of its last save (§10.6).

### 10.4 Answer rhythm

1. Tap: press state plus a `selection` haptic within **≤ 100 ms**.
2. Lock: at least 150 ms, which prevents double taps.
3. Reveal: 500–700 ms showing correct or incorrect, with the `correct` or `wrong` haptic and sound. On a wrong answer, the correct option is also highlighted.
4. The explanation appears.
5. The user taps **Next**. Auto-advance is **off by default**; an optional setting advances after 1.5 s on a correct answer.

### 10.5 Scoring *(all values tunable)*

- **Base points** for a correct answer: `100 × difficultyMultiplier`, where the multiplier ranges from 0.8 to 1.5 and comes from the question's rating.
- **Speed bonus** (timed modes only): up to +50%, proportional to the time remaining on the question's **Standard** limit, whatever the player's A11Y-08 setting. Extra time helps a player answer but never earns extra points, and an answer after the Standard limit gets no speed bonus (D13).
- **Combo:** +10 for each consecutive correct answer, capped at +50.
- **Points and XP are separate.** Points rank a single session; XP measures progress (§6.4).

### 10.6 Persistence and recovery

- While a session can be resumed, each state transition saves a snapshot of it to MMKV, keyed by `sessionId` (ADRs 0037 and 0040). Results delete it.
- **Resuming** applies to non-Tier-A sessions only. An unfinished session can be resumed until the end of its date (for a daily) or its `expiresAt`, whichever comes first. The Global Daily offers it on Today as **Continue** (DLY-04); there's no launch prompt. A restored session opens on the pause overlay, and the time since its last save counts as pause time (§10.3).
- **Completed sessions** go through the outbox (§16, ADR 0040). A completion is written there before its first send, so one finished offline, or cut off mid-send, syncs later under the same `Idempotency-Key`.

### 10.7 Preloading

- While question *n* is displayed, prefetch question *n+1*'s images, audio and pre-rendered math.
- Warm the explanation media for question *n* during `presenting`.

---

## 11. Content model

### 11.1 Entities

| Entity | Key fields |
|---|---|
| **Question** | `id`, `version`, `type`, `prompt` (blocks), `payload` (options or answer data per type), `explanation` (blocks), `sources[]`, `domain`, `topic`, `subtopic`, `tags[]`, `rating` (Glicko-2: rating, deviation), `editorialDifficulty`, `locale`, `regionTags[]`, `minAge`, `mediaTypes[]`, `authorId`, `reviewerId`, `status` (draft, in_review, published, suspended, retired), `stats` |
| **Quiz** | `id`, `version`, `title`, `description`, `cover`, `questionRefs[]` (question id + version), `settings` (timed, time per question, shuffle), `visibility` (private, unlisted, public), `locale`, `domain`, `topic`, `authorId`, `status` |
| **MediaAsset** | `id`, `kind` (image, audio, svg), `url`, `width`, `height`, `placeholder` (blurhash or thumbhash), `alt` (required for images), `transcript` (required for audio), `durationMs`, `bytes` |
| **Taxonomy** | `domain` → `topic` → `subtopic`, plus curated `tags` |

A MediaAsset's own `alt` and `transcript` describe it in the media library and are where an editor's text starts. They aren't sent to a device: a device renders the block's (§11.3).

### 11.2 Versioning
- Editing a published question or quiz creates a **new version**.
- Sessions, challenges and stats point to the exact version played.
- A retired question stays readable for history but is never served again.

### 11.3 Rich content blocks

Question text is stored as **structured blocks**, never raw HTML or Markdown strings (ADR 0008). Content is a flat list: a block never holds another block.

**Inline content**, inside a paragraph, a quote or a list item, is text spans and links:
- a **text span** carries up to five inline marks: bold, italic, code, subscript, superscript (never subscript with superscript);
- a **`link`** holds text spans and one https address in canonical form (lowercase `https://` and domain; no credentials, port or IP address), which opens in the in-app browser (SEC-08). A link can't hold a link.

| Block | Rendering |
|---|---|
| `paragraph` | Inline content |
| `math` | LaTeX source. **Rendered to SVG on the server when the question is published** (MathJax, with `mhchem` for chemistry), and displayed as SVG on the device. The editor's live preview may use an Expo DOM component with KaTeX. |
| `code` | Source plus language, **tokenized when published**. The device renders the tokens with theme colors. |
| `image` | A MediaAsset reference by id, with the block's own **alt text**. Pinch to zoom; a placeholder shows while loading. |
| `audio` | A MediaAsset reference by id, with the block's own **transcript**. Clips ≤ 30 s, loudness-normalized. |
| `quote`, `list` | Plain structural blocks holding inline content; a list holds items, not lists |

**The text a device renders is the block's.** An image's alt text and an audio clip's transcript are written on the block, because the same image can need different words in two questions (ADR 0008). The published media asset a device fetches carries neither (ADR 0022).

### 11.4 Launch domains (proposed, 11)

Science · Math & Logic · Technology · Food & Cooking · History · Geography · Arts & Literature · Words & Language · Nature & Animals · Sports · Entertainment (film, TV, music)

### 11.5 Difficulty and personalization

- **Ratings:**
  - Every question carries a Glicko-2 rating, seeded from its editorial difficulty (easy 1200, medium 1500, hard 1800 *(tunable)*) and updated from play.
  - Every user has a rating per domain (later, per topic).
- **Question selection** targets about **70% predicted success** *(tunable)*, the "flow zone".
- **Automatic flags for review** come from question stats:
  - p-correct < 5% or > 98%;
  - a wrong option chosen more often than the correct one;
  - a high report or quit rate.

### 11.6 Content operations (MVP)

- **Editorial guidelines:** tone, length, how to write good wrong answers, citation rules, and cultural neutrality.
- **Pipeline:** source → draft (human or AI) → fact-check against sources → review → publish.
- **AI output is never published without human review.**
- **Launch target:** ≥ 3,000 reviewed questions across 11 domains, and ≥ 60 days of Global Daily sets scheduled.

---

## 12. Design system

### 12.1 Approach: brand in the content, native in the chrome

| Native (platform look and behavior) | Branded (identical on both platforms) |
|---|---|
| Tab bar (NativeTabs; Liquid Glass on iOS 26), navigation headers, sheets, menus, pickers, switches, sliders, alerts, search bar, via `@expo/ui` and Expo Router | Quiz session, answer buttons, cards, Today modules, results and celebrations, badges, league table, share cards, mascot, empty states |

On iOS 26+, `expo-glass-effect` may be used for branded floating elements. Other platforms fall back to solid surfaces.

### 12.2 Color

**Token layers:**
- **primitive ramps**, for example `cobalt.50…950`;
- **semantic tokens**, for example `surface.raised`;
- **component tokens**, for example `answer.correct.bg`.

**Semantic tokens:**
- `bg`, `surface`, `surface.raised`, `surface.sunken`
- `text.primary`, `text.secondary`, `text.inverse`
- `border`, `brand`, `brand.contrast`
- `success`, `error`, `warning`, `info`
- `xp` (gold), `streak` (flame), `premium`
- one `category.<domain>` group per domain

**Category hues** (direction only; final values are set in P0):

| Domain | Hue | Domain | Hue |
|---|---|---|---|
| Science | Cobalt | Arts & Literature | Magenta |
| Math & Logic | Indigo | Words & Language | Violet |
| Technology | Cyan | Nature & Animals | Moss |
| Food & Cooking | Tangerine | Sports | Sunflower |
| History | Terracotta | Entertainment | Rose |
| Geography | Teal | | |

**Rules:**
- Text contrast is ≥ 4.5:1, and ≥ 3:1 for large text and UI components, in **both** themes.
- Correct and incorrect **never rely on color alone**. They always pair color with an icon (✓ / ✕), text and a haptic.
- Category hues must stay visually distinct from `success` and `error`, and always come with an icon and a label.
- Check palettes for deuteranopia, protanopia and tritanopia.
- **The dark theme is designed separately, not inverted.** Use near-black surfaces with tonal layers.
- A high-contrast theme is available (A11Y-12).

### 12.3 Typography

- **Two families:**
  - an expressive **display** face for the brand;
  - a highly legible **text** face with broad script coverage (for example Inter, with Noto fallbacks).
- **Licensing:** confirm the licenses allow embedding in an app.
- **Type scale** (pt; sizes at the default text setting):

| Token | Size / line height | Use |
|---|---|---|
| `display` | 34 / 40 | Results score, milestones |
| `title1` | 28 / 34 | Screen titles |
| `title2` | 22 / 28 | Question text (short) |
| `title3` | 20 / 25 | Question text (long) |
| `headline` | 17 / 22, semibold | Answer text, card titles |
| `body` | 17 / 22 | Explanations, body copy |
| `callout` | 16 / 21 | Secondary content |
| `footnote` | 13 / 18 | Metadata |
| `caption` | 12 / 16 | Labels |
| `countdown` | 88 / 96, bold | The 3-2-1 before a timed session (the text face, Inter: it's a timer) |

- **All text scales** with the system text size (Dynamic Type on iOS, font scale on Android). Content text is never capped; dense chrome may be capped where the platform allows it.
- **Long questions** step down from `title2` to `title3`, never below `body`.

### 12.4 Spacing, radius, elevation

- **Spacing:** 4-pt grid. Tokens: `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`, `2xl 32`, `3xl 48`.
- **Gutters:** 16 on phones, 24 on tablets. Maximum readable content width: 640.
- **Radius:** `sm 8`, `md 12`, `lg 16`, `xl 24`, `pill`. Answer buttons use `lg`.
- **Elevation:** prefer tonal layering, with a single shadow level for floating elements.

### 12.5 Motion

Final values are tuned in P0.

| Token | Value | Use |
|---|---|---|
| `instant` | 100 ms or the `snappy` spring | Press feedback |
| `fast` | 150 ms | Chips, toggles, small state changes |
| `base` | 250 ms | Elements entering or leaving, content changes |
| `slow` | 400 ms | XP bar fill, progress |
| `celebrate` | 800–1200 ms | Confetti, level up, milestones |
| `snappy` spring | damping 20, stiffness 300 | Buttons, selection |
| `gentle` spring | damping 18, stiffness 150 | Cards, sheets content |
| `bouncy` spring | damping 10, stiffness 180 | Rewards, badges |

**Rules:**
- Animate transform and opacity on the UI thread (Reanimated).
- Keep celebration motion for real achievements.
- Under Reduce Motion, replace movement with fades of ≤ 150 ms. There is no parallax and there are no particles.

### 12.6 Haptics

| Token | Trigger | `expo-haptics` |
|---|---|---|
| `selection` | Option tap, chip toggle | `selectionAsync()` |
| `tap` | Primary button | `impactAsync(Light)` |
| `correct` | Correct answer | `notificationAsync(Success)` |
| `wrong` | Incorrect answer | `notificationAsync(Error)` |
| `tick` | Each of the timer's last 3 s | `impactAsync(Light)` |
| `milestone` | Level up, streak milestone, badge | `notificationAsync(Success)` followed by `impactAsync(Heavy)` |

**Rules:**
- No more than one haptic per ~100 ms.
- There is a user toggle, and system haptic settings are respected.

### 12.7 Sound

- **Tokens:** `tap`, `correct`, `wrong`, `tick`, `countdown`, `streak`, `levelUp`, `celebrate`.
- **Length:** ≤ 400 ms, except `celebrate`. All sounds are loudness-normalized.
- **Audio session:** sounds **mix with the user's other audio** (music, podcasts) and never interrupt it. On iOS they respect the silent switch by default.
- **Music** is off by default. Sound never carries essential information on its own.

### 12.8 Icons, illustration, mascot

- **Chrome icons:** SF Symbols through `expo-symbols` on iOS, and Material Symbols on Android.
- **Brand illustrations:** a custom set for domains, badges and currencies.
- **Mascot:** states for idle, happy, thinking, sad, celebrate and sleeping. Static images at MVP. A Rive state machine is planned for V1, once Rive's Nitro version range is compatible with Unistyles (roadmap §3.2); a static image for each state stays under Reduce Motion.

### 12.9 Component inventory

| Component | States and variants | Phase |
|---|---|---|
| `AnswerButton` | idle, pressed, selected, locked, correct, incorrect, revealed-correct, disabled; text and image variants; keyboard hint | MVP |
| `QuestionView` | Renders blocks; short and long layouts | MVP |
| `TimerRing` / `TimerBar` | running, warning, paused, extended, hidden (untimed) | MVP |
| `ProgressSegments` | upcoming, current, correct, incorrect | MVP |
| `QuizCard` | S / M / L; new, in progress, completed | MVP |
| `CategoryChip`, `CategoryCard` | default, selected; per-domain color | MVP |
| `DailyCard` | available, in progress, completed, next unlock (countdown) | MVP |
| `StreakFlame` | inactive, lit today, at risk, frozen, milestone | MVP |
| `XPBar`, `LevelBadge` | idle, filling, level-up | MVP |
| `DailyGoalRing` | 0–100%, complete | MVP |
| `ExplanationPanel` | collapsed, expanded; sources; report | MVP |
| `ResultSummary`, `ShareCard` | Renders to an image for sharing | MVP |
| `CelebrationLayer` | full, reduced (Reduce Motion), off | MVP |
| `ChallengeCard` | your turn, waiting, won, lost, expired | MVP |
| `Button` | primary, secondary, tertiary, destructive; S / M / L; loading, disabled | MVP |
| `Avatar` | sizes; cosmetic frame (V1) | MVP |
| `BadgeTile` | locked, unlocked, new | MVP |
| `EmptyState`, `ErrorState`, `Skeleton`, `Toast`, `OfflineBanner` | n/a | MVP |
| `Mascot` | static (MVP), Rive state machine (V1) | MVP / V1 |
| `LeagueTable`, `LeagueRow` | promotion, neutral, demotion zones; "you" | V1 |
| `LifelineBar` | available, used, disabled | V1 |
| `ReactionBar` | Preset emotes | V1 |
| `EditorBlock` components | Creator editor | V1 |
| `KnowledgeMap` | n/a | V2 |
| `LobbyCountdown`, `LiveStandings` | n/a | V2 |

**Native components** (`@expo/ui` and Expo Router): BottomSheet, Menu, Picker, Switch, Slider, header search bar, tabs.

**Gallery:** every component is shown in a development-only gallery route in the app, in **every state × light, dark and high contrast × default and largest text size** (ADR 0043). The route is left out of production builds. It replaces Storybook, which is revisited at V1.

---

## 13. Accessibility

| ID | Requirement | Phase |
|---|---|---|
| A11Y-01 | Every interactive element has an accessible role, label and state. Custom components expose `selected`, `disabled`, and the correct/incorrect result. | MVP |
| A11Y-02 | When the question changes, screen-reader focus moves to the question text. The answer result is announced, for example "Correct. Paris." | MVP |
| A11Y-03 | Layouts reflow without clipping up to the largest accessibility text sizes (at least 200%). | MVP |
| A11Y-04 | Reduce Motion is respected (§12.5). The timer still shows remaining time as text. | MVP |
| A11Y-05 | Color is never the only signal (§12.2). Palettes are checked for color-blindness. | MVP |
| A11Y-06 | Text contrast is ≥ 4.5:1, and ≥ 3:1 for large text and UI components, in both themes. | MVP |
| A11Y-07 | Touch targets are ≥ 44×44 pt (iOS) and ≥ 48×48 dp (Android). Answer buttons are ≥ 56 pt tall. | MVP |
| A11Y-08 | **Adjustable timing:** Untimed and Extended (×1.5, ×2) settings. Events that are timed-only say so in advance. | MVP |
| A11Y-09 | Every drag interaction has an alternative: accessibility actions ("move up", "move down") and tap-to-select-then-place. | MVP |
| A11Y-10 | Question images require alt text and audio requires a transcript. This is enforced in the editor and in the content pipeline. | MVP |
| A11Y-11 | Hardware keyboard support on tablets and the web (§9.2). | MVP |
| A11Y-12 | Optional dyslexia-friendly font, high-contrast theme and larger answer buttons. | MVP |
| A11Y-13 | Sound never carries essential information alone. | MVP |
| A11Y-14 | A release checklist covering VoiceOver, TalkBack, largest text, Reduce Motion, keyboard, and forced RTL (once localized). | MVP |

---

## 14. Localization

| ID | Requirement | Phase |
|---|---|---|
| L10N-01 | Every UI string is externalized from day one (i18next with ICU message format). No hard-coded copy. | MVP |
| L10N-02 | A pseudo-localization build (longer strings, accented characters) is used in QA. | MVP |
| L10N-03 | The app language follows the device, with an in-app override. | MVP (structure) |
| L10N-04 | Content language is separate from UI language. Users may choose several content languages. | V1 |
| L10N-05 | Questions have per-locale variants. Untranslated content is hidden or labeled. | V1 |
| L10N-06 | Region tags mark culture-specific questions, and personalization respects them. | MVP (tags), V1 (use) |
| L10N-07 | **RTL:** layouts and directional icons mirror, tested with RTL forced on. Answer labels (A–D or 1–4) are localized. | V1 |
| L10N-08 | Fonts cover the target scripts (Latin, Devanagari, Arabic, CJK when needed), with fallbacks and line heights tuned per script. | V1 |
| L10N-09 | Numbers, dates, durations and plurals are formatted with `Intl`. | MVP |
| L10N-10 | Machine translation is allowed only as a draft. Localized questions need human review before publishing, because a translation can change which answer is correct. | V1 |
| L10N-11 | Launch is in English. V1 languages are chosen from demand data. | MVP / V1 |

---

## 15. Performance and non-functional requirements

### 15.1 Reference devices
- **Android low end:** 3–4 GB RAM, budget chipset (Galaxy A14 class). **This is the performance truth.**
- **Android mid range.**
- **Oldest iPhone** supported by the SDK's minimum iOS version, and a current iPhone.
- **One iPad.**

### 15.2 Budgets

Breaching a budget blocks the release.

| Metric | Budget |
|---|---|
| Cold start to an interactive Today screen (p75) | ≤ 2.0 s on low-end Android; ≤ 1.2 s on a current iPhone |
| Warm start | ≤ 0.8 s |
| Tap → visual and haptic feedback | ≤ 100 ms |
| Transition to the next question (assets preloaded) | ≤ 300 ms |
| Frame rate in the quiz session and lists | Sustained 60 fps (120 on ProMotion); no hitch > 50 ms during reveal |
| React renders during the timer | None per tick (§10.3); while a screen reader runs, only the timer's accessible value, once a second |
| Memory during a session | ≤ 300 MB on low-end Android |
| Store download size | ≤ 50 MB; alert on +10% growth per release |
| Question image payload | ≤ 150 KB at device width (AVIF or WebP) |
| Crash-free sessions | ≥ 99.5% (MVP), ≥ 99.8% (V1) |
| Crash and ANR rates | Below Google Play's Android vitals bad-behavior thresholds |
| Network handling on the device | Skeleton within 100 ms; 10 s timeout; retries with exponential backoff and jitter |
| Battery | No background polling. Background work is limited to prefetching daily sets. |

### 15.3 Practices
- **Rendering:**
  - React Compiler is on (the Expo default).
  - No Context for high-frequency state; use Zustand with selectors.
  - FlashList 2 for every long list, with Legend List as the fallback (ADR 0036).
- **Images:** `expo-image` with placeholders and prefetching.
- **Animation:** all of it runs through Reanimated on the UI thread.
- **Startup:**
  - Keep the root layout light, and defer non-critical work (analytics init, prefetch) until after the first frame.
  - Load heavy scenes (Skia, Rive) lazily.
- **Measurement:** use React Native DevTools and the platform profilers. Record startup time on reference devices every release.

### 15.4 Scalability on the device side
- **Pagination and caching:** cursor pagination everywhere, and caching that honors ETag and Cache-Control.
- **Deduplication:** TanStack Query merges duplicate requests.
- **Load spreading:** the daily prefetch runs at a **randomized time** within a window, so millions of devices don't hit the server at midnight. After push-notification bursts, devices wait a random delay before refetching.

---

## 16. Offline and sync

| ID | Requirement | Phase |
|---|---|---|
| OFF-01 | Today's and tomorrow's Global Daily and Daily 5 are prefetched whenever the device is online, each kept as its session. | MVP |
| OFF-02 | Downloadable topic packs for offline play (a Premium perk). | V1 |
| OFF-03 | Completed sessions go into an **outbox** on the device (MMKV, ADR 0040) with idempotency keys. They sync on launch, on reconnect and on return to the foreground, with backoff. | MVP |
| OFF-04 | The streak is credited from the completion timestamp, checked against the last known server time offset. The server validates plausibility. | MVP |
| OFF-05 | Tier A modes are unavailable offline, and the UI says so clearly. | V2 |
| OFF-06 | The offline indicator never blocks the user. | MVP |
| OFF-07 | The query cache is persisted to MMKV and restored before the first render, then revalidated in the background (ADR 0038). | MVP |

---

## 17. Security, integrity, privacy and compliance

### 17.1 Security and integrity (`SEC`)

| ID | Requirement | Phase |
|---|---|---|
| SEC-01 | No secrets in the app bundle. | MVP |
| SEC-02 | The app holds a revocable server-side session, kept in `expo-secure-store`. A separate secret held on the device, also in `expo-secure-store`, can start a new session for the same guest at any time, so an expired session never orphans a streak. The secret never appears in logs or analytics (ADR 0073). | MVP |
| SEC-03 | Integrity tiers are enforced as in §10.1. | MVP |
| SEC-04 | Device attestation (App Attest or Play Integrity) for Tier A. | V2 |
| SEC-05 | The server checks plausibility on Tier B results (§10.1). | MVP |
| SEC-06 | "Slow down" (HTTP 429) and `Retry-After` responses are handled gracefully. | MVP |
| SEC-07 | Deep-link parameters are validated. A link never performs an action on its own; accepting a challenge takes a tap. | MVP |
| SEC-08 | Content renders from structured blocks only, never HTML. Links in content are https-only and open in the in-app browser. | MVP |

### 17.2 Privacy and compliance (`PRIV`)

| ID | Requirement | Phase |
|---|---|---|
| PRIV-01 | Age gate 13+ (ONB-06). | MVP |
| PRIV-02 | **Account deletion in the app** (App Store guideline 5.1.1(v)). | MVP |
| PRIV-03 | Data export on request (GDPR). | V1 |
| PRIV-04 | Analytics consent where required (EU and UK). No cross-app tracking, so no App Tracking Transparency prompt. | MVP |
| PRIV-05 | An accurate iOS privacy manifest, App Store privacy labels, and Google Play Data safety form. | MVP |
| PRIV-06 | Offering Google sign-in means also offering a privacy-focused option; **Sign in with Apple** meets this (guideline 4.8). | MVP |
| PRIV-07 | **UGC requirements (guideline 1.2):** content filtering, reporting, blocking and published contact info are in place before any user text is visible to others, and usernames count as user text. | MVP |
| PRIV-08 | Minimal data collection: no contact upload and no precise location. Region comes from locale or coarse IP. | MVP |
| PRIV-09 | Terms, privacy policy and community guidelines are reachable in the app. | MVP |

---

## 18. App architecture and tech stack

### 18.1 Platform versions (verified 2026-09-27 and 2026-11-14)

Version 1.1 takes its versions from roadmap §3.1 and ADR 0030. Check the official docs again on the day you install or upgrade.

- **Start on Expo SDK 58** (58.0.25): React Native 0.88, React 19.3, stable since 2026-10-15 (ADR 0030). It sets the floor: iOS 16.4 and Android `minSdk` 24.
- The **New Architecture has been mandatory since SDK 55.** React Compiler is enabled by default in the Expo template.
- **NativeTabs:** stable on SDK 58, imported from `expo-router/native-tabs`.
- **`@expo/ui`:** stable since SDK 56. **`expo-widgets`:** stable for iOS since SDK 56. On 2026-09-27 Android widgets were in the SDK 58 beta; NTF-08's ticket checks their state before building on them.
- **`expo-av` was removed** in SDK 55. Use `expo-audio` and `expo-video`.

### 18.2 Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 58, **development builds** (not Expo Go), TypeScript ~6.0 strict | ADR 0030 |
| Navigation | Expo Router | NativeTabs, native stack, form sheets with detents, link previews (iOS), typed routes, universal links, shared routes across tabs |
| Native UI | `@expo/ui`, `expo-glass-effect`, `expo-symbols` | Native chrome and SwiftUI/Compose controls |
| Styling and theming | **Unistyles 3** | Themes switch without re-renders; fits a token-based multi-theme system |
| Animation and gestures | Reanimated 4, `react-native-worklets`, Gesture Handler | UI-thread animation and timers |
| Graphics | React Native Skia, loaded lazily | Confetti and particles, and share cards only (ADR 0035) |
| Timer ring and bar | `react-native-svg` plus Reanimated | §10.3 (ADR 0035) |
| Mascot | Static images (MVP); Rive React Native runtime (V1) | Rive's Nitro version range conflicts with Unistyles today; re-check at V1 (roadmap §3.2) |
| Haptics and sound | `expo-haptics`, `expo-audio` | §12.6, §12.7 |
| Lists | FlashList 2 | Legend List is the fallback (ADR 0036) |
| Images and video | `expo-image`, `expo-video` | |
| Session state | XState v5 | §10.2 |
| Server state | TanStack Query v5, persisted to MMKV | |
| UI and app state | Zustand | Settings, onboarding, preferences |
| Key-value storage | `react-native-mmkv` v4 (+ `react-native-nitro-modules`) | |
| Structured local data | `expo-sqlite` + Drizzle ORM (V1) | Offline packs and the mistakes cache. The outbox is in MMKV (ADR 0040). |
| Secrets | `expo-secure-store` | The session token and the device secret (SEC-02) |
| Validation and contracts | zod | Shared with the API through `packages/contracts` |
| Forms | react-hook-form + zod | Creator editor (V1) |
| API client | A thin client driven by the `contracts` endpoint registry | Validates every response at run time and handles timeouts, backoff and 429 in one place. `hc` is used only by the admin console (ADR 0041) |
| Mocks | An in-process fake server from `packages/contracts`, injected at the client's transport | Fixture scenarios (§19.6), shared with tests (ADR 0042) |
| i18n | `expo-localization` + i18next (ICU) | |
| Auth (device side) | Better Auth Expo client, Sign in with Apple (`expo-apple-authentication`), Google | Better Auth on the API (§19.1, ADR 0045) |
| Notifications | `expo-notifications` + the Expo push service | |
| Widgets and Live Activities | `expo-widgets` | |
| Sharing | `expo-sharing`; share cards drawn with Skia | ADR 0035 |
| Media input (V1) | `expo-image-picker`, `expo-image-manipulator`, `expo-camera` (scan-to-quiz, V2) | |
| Store review | `expo-store-review` | RES-04 |
| Purchases (V1) | RevenueCat (`react-native-purchases`) | |
| Analytics, flags, experiments | PostHog | |
| Crash and performance monitoring | Sentry (`@sentry/react-native`) for crashes; EAS Observe for startup and navigation timing | Observe doesn't replace Sentry yet (ADR 0048) |
| OTA updates | `expo-updates` + EAS Update, fingerprint runtime versions | |
| Design workbench | A development-only gallery route in the app | Every state × theme × text size; replaces Storybook until V1 (§12.9, ADR 0043) |
| Testing | Jest and React Native Testing Library for the app; Vitest for the shared packages and the API; fast-check; Maestro | §21 (ADRs 0002, 0050, 0065) |
| CI/CD | GitHub Actions for checks and API deploys; EAS Build, Submit, Update and Workflows for the app | ADR 0071 |
| Repository | pnpm 11 workspaces monorepo | §18.3 (ADR 0069) |

### 18.3 Monorepo layout

```
/
├── apps/
│   ├── mobile/              # Expo app (iOS, Android, web share and marketing pages)
│   ├── api/                 # Hono API and worker
│   └── admin/               # React Admin console (internal)
├── packages/
│   ├── contracts/           # zod schemas, endpoint registry, error codes, fixtures, fake server
│   ├── quiz-engine/         # question-type schemas, graders, normalization, scoring (shared by app and server)
│   ├── game-rules/          # streak and day-boundary logic, XP, levels, badge rules (pure functions)
│   ├── content-blocks/      # block schema and validation (shared)
│   ├── content-tools/       # content:validate, import, drafting helpers
│   ├── design-tokens/       # tokens as data: Unistyles themes, CSS variables
│   └── config/              # tsconfig, eslint, prettier presets
├── content/                 # question drafts and daily sets, as files until the CMS owns them
└── docs/
    ├── spec.md              # this document
    ├── roadmap.md           # phases, tickets, stack and guardrails
    ├── traceability.md      # MVP requirements to tickets
    ├── adr/                 # architecture decision records
    ├── plans/               # ticket plans
    └── design/              # approved screens, tokens and component specs
```

The layout follows roadmap §4.2.

### 18.4 App source layout (by feature)

```
apps/mobile/src/
├── app/                     # Expo Router routes only (thin)
├── features/
│   ├── session/             # state machine, play screen parts, timer, preloading
│   ├── daily/
│   ├── streaks/
│   ├── progress/            # XP, levels, goals, badges
│   ├── challenges/
│   ├── explore/
│   ├── profile/
│   ├── leagues/             # V1
│   ├── mistakes/            # V1
│   ├── creator/             # V1
│   ├── onboarding/
│   └── settings/
├── question-types/          # renderers + editor forms per type (graders live in quiz-engine)
├── design-system/
│   ├── tokens/              # from packages/design-tokens: color, type, spacing, radius, motion, haptics, sound
│   ├── components/
│   └── theme/               # Unistyles themes (light, dark, high-contrast)
├── lib/
│   ├── api/                 # client, query keys, error mapping
│   ├── storage/             # mmkv, sqlite (drizzle), secure-store
│   ├── analytics/
│   ├── i18n/
│   ├── haptics/  sound/
│   └── notifications/
└── mocks/                   # fake-server wiring and the scenario switcher (the fake server is in packages/contracts)
```

**Rules:**
- A feature exposes a public `index.ts`. **No deep imports across features.**
- Route files stay thin: they compose feature components.
- Lint rules forbid raw colors, spacing values and font sizes outside `design-system`.

### 18.5 State layers

| Layer | Tool | Holds |
|---|---|---|
| Server state | TanStack Query (+ MMKV persistence) | Content, profile, progress, challenges |
| Session state | XState machine per session (+ MMKV snapshot) | The active quiz |
| App and UI state | Zustand | Settings, onboarding progress, preferences |
| Durable local data | MMKV now; SQLite + Drizzle from V1 | The outbox and kept dailies (MMKV, ADR 0040); offline packs and the mistakes cache (SQLite) |
| Secrets | SecureStore | The session token and the device secret |

### 18.6 Engineering standards
- **Language and tooling:** TypeScript strict; ESLint 9 and Prettier (ADR 0070); conventional commits; an ADR for every significant decision.
- **Error handling:** an error boundary per route (Expo Router's `ErrorBoundary` export), with user-safe messages mapped from error codes.
- **Feature flags:** every new feature ships behind a flag, and a kill switch exists for every risky surface.

---

## 19. Backend contract

The API is built now, in this monorepo, contract first (D5, ADR 0072). This section records what the app relies on. Every endpoint exists as a zod schema in `packages/contracts` before the API or the app implements it, and the app, the API and the fake server (§19.6) parse with the same schemas. Roadmap §4.3 describes the three flows that must be right: guest identity, fetching the daily, and completing a session.

### 19.1 Stack

The choices and their versions are in roadmap §3.1 and ADRs 0051 to 0068.

- **Runtime:** **Hono** 4 on Node 26, in one container image that runs an API process and a worker process (ADR 0051), on Fly.io with at least two machines (ADR 0052).
- **Database:** **Postgres** on Neon (ADR 0053), through Drizzle's SQL-style builder (ADR 0054).
- **Cache and rate limits:** Postgres and the CDN. There is no Redis or Valkey at MVP: leagues stay in Postgres, and Redis is reconsidered for live events in V2 (ADR 0056).
- **Media:** Cloudflare R2 behind the CDN, with image variants generated at publish (ADR 0059). Cloudflare also sits in front of the API: CDN, WAF and per-IP rate limits (ADR 0060).
- **Real time:** WebSockets for live events (V2).
- **Jobs and schedules:** pg-boss, in the same database (ADR 0055): daily sets, league rollover, streak evaluation and notifications.
- **Auth:** Better Auth, pinned exactly, with **guest accounts and account linking** (ADR 0057). All game data is keyed to our own player id, never to the auth library's user id.
- **Moderation:** on the server, before content is visible. At MVP that is text: usernames pass a blocklist and a moderation service behind our own interface (ADR 0062). Images need none until public content arrives in V2.

### 19.2 Contract rules

| Rule | Why the app cares |
|---|---|
| Schemas live in `packages/contracts` (zod). The server validates input and the app parses output. | One source of truth, with compile-time breakage |
| Cursor pagination (`cursor`, `limit`, `nextCursor`) | Stable infinite lists |
| An `Idempotency-Key` header on session completion, answers, purchases and reports | Safe retries from the outbox |
| Server time in `/config` and on every session response | Streaks, daily unlocks and timers resist clock tampering |
| Versioned content with `ETag` / `Cache-Control` | Aggressive caching that invalidates correctly |
| Errors as RFC 9457 problem details with a stable `code` | The app shows localized messages |
| A revocable server-side session, and a secret held on the device that can start a new one for the same guest (SEC-02, ADR 0073) | Secure sessions; a guest's identity outlives any session |
| `/config` returns remote config, flags, `minAppVersion`, an optional `updateUrl` per platform and daily-set metadata | Kill switches, forced updates, tunables |
| 429 responses carry `Retry-After` | Graceful backoff |
| Timestamps in ISO 8601 UTC; the client sends its IANA time zone and its UTC offset in minutes (local time minus UTC, east positive), as ADR 0024 sets out | Correct day boundaries |

### 19.3 Resource outline

| Area | Endpoints (indicative) | Phase |
|---|---|---|
| Auth and account | `POST /auth/guest`, provider sign-in, `POST /auth/link`, `GET/PATCH /me`, `DELETE /me`, `POST /me/export` | MVP (export V1) |
| Config | `GET /config` | MVP |
| Content | `GET /domains`, `GET /topics/:slug`, `GET /quizzes?filters&cursor`, `GET /quizzes/:id`, `GET /collections/:slug`, `GET /search?q` | MVP |
| Dailies | `GET /daily/global/:date/:contentVersion`: the Global Daily's body, public and immutable, served from the CDN (ADR 0024); `GET /daily/personal?date=` | MVP |
| Sessions | `POST /sessions {source}` → questions (with keys for Tier B); a Global Daily session holds its `contentVersion` instead, and the app fetches the body once per version · `POST /sessions/:id/complete` (Tier B batch: answers, timings, pauses) · `POST /sessions/:id/answers` (Tier A, per answer) · For a daily, `POST /sessions` is get-or-create per player and date, accepts tomorrow, and expires at the end of the date | MVP / V2 |
| Progress | `GET /me/progress` (XP, level, streak, freezes, goal), `GET /me/badges`, `GET /me/mistakes` | MVP / V1 |
| Leagues | `GET /leagues/current` | V1 |
| Challenges | `POST /challenges`, `GET /challenges?status=`, `GET /challenges/:code`, `POST /challenges/:code/accept` | MVP |
| Social | Friends CRUD, `POST /blocks`, `DELETE /blocks/:id` | V1 (blocks MVP) |
| Safety | `POST /reports` | MVP |
| Devices and notifications | `PUT /devices/:id` (push token, platform, locale, time zone, app version), `GET/PUT /me/notification-prefs` | MVP |
| Creator | Drafts CRUD, signed media upload URLs, `POST /quizzes/:id/publish` | V1 |
| Purchases | Entitlements via RevenueCat webhooks → `GET /me/entitlements` | V1 |

### 19.4 Real-time protocol outline (V2)
- **Connect:** authenticated WebSocket → `join {eventId}`.
- **Server → client:**
  - `room.state`
  - `question.start {question, deadline, serverTime}`
  - `question.end {correct, distribution}`
  - `standings`
  - `event.end`
- **Client → server:** `answer {questionId, answer, idempotencyKey}`.
- **Resilience:**
  - heartbeats;
  - a resume token for reconnecting;
  - the server sends a full snapshot after a reconnect;
  - the client recomputes its clock offset from `serverTime`.

### 19.5 Domain entities
- **People:** User, GuestLink, Profile, Device, NotificationPrefs, Interest.
- **Content:** Domain, Topic, Subtopic, Tag, Question (+ versions), Quiz (+ versions), MediaAsset, QuestionStats.
- **Play:** DailySet, Session, SessionAnswer.
- **Progress:** Streak, StreakEvent, XPEvent, Level, Badge, UserBadge.
- **Competition:** Rating (user × domain), League, LeagueCohort, LeagueMembership, Challenge, LiveEvent.
- **Social and safety:** Friendship, Block, Report, ModerationCase.
- **Commerce:** Wallet, WalletTransaction, Entitlement.

### 19.6 The fake server
- `packages/contracts` ships a fake server: plain functions that answer the registry's endpoints from shared fixtures and scenarios. It is injected at the app's client transport and runs in the app's own process, and tests use the same one (ADR 0042). A production build can't switch it on.
- **Scenario switcher** (dev menu):
  - new user;
  - 100-day streak;
  - frozen streak;
  - league promotion;
  - expired challenge;
  - offline;
  - slow network;
  - server errors;
  - forced update.

---

## 20. Analytics and experimentation

- **Tools:** PostHog for events, funnels, retention, feature flags and A/B tests. Sentry for crashes, and EAS Observe for startup and navigation timing (ADR 0048).
- **Naming:** `object_action` in snake_case.
- **Common properties:** `session_source`, `mode`, `quiz_id`, `domain`, `locale`, `app_version`, `ota_update_id`, `is_guest`.
- **No personal data in event properties.** Consent is respected (PRIV-04).

**Core events:**
- **Lifecycle:** `app_opened`, `onboarding_step_completed`, `interest_selected`.
- **Play:** `session_started`, `question_viewed`, `question_answered` (type, correct, time_ms, difficulty, mode), `session_completed`, `session_abandoned`, `explanation_opened`, `question_reported`.
- **Retention:** `streak_extended`, `streak_frozen`, `streak_lost`, `streak_repaired`, `daily_goal_completed`, `level_up`, `badge_earned`.
- **Social:** `share_card_shared`, `challenge_sent`, `challenge_opened`, `challenge_completed`.
- **Notifications:** `notification_primer_shown`, `notification_permission_result`, `notification_opened`, `widget_tapped`.
- **Accounts and money:** `account_created`, `guest_upgraded`, `paywall_viewed`, `purchase_completed`, `account_deleted`.

**Key funnels:**
- **Onboarding:** install → first question → first quiz completed → notification opt-in → account.
- **Daily loop:** notification or widget → Today → daily completed → share.
- **Challenge virality:** sent → opened → installed → played → challenged back.

**Initial experiment backlog:**
- notification primer copy and timing;
- Global Daily length (5 vs 8);
- number of streak freezes;
- difficulty of the first quiz;
- share card design.

---

## 21. Quality, testing and release

### 21.1 Testing

| Layer | Tooling | Coverage focus |
|---|---|---|
| Unit | Vitest, fast-check (property-based), for the shared packages (ADR 0002) | Graders, answer normalization, scoring, **streak, time-zone and DST logic**, league math, economy |
| Component | Jest and React Native Testing Library (ADR 0050) | Design-system components, session screen states |
| API | Vitest against real Postgres (ADR 0065) | Endpoints, write paths, idempotency and duplicate requests |
| Visual | The gallery route (§12.9) | Every state × theme × text size |
| End-to-end | Maestro on EAS Workflows | Onboarding → first quiz; Global Daily; challenge deep link; resume after interruption; complete offline → sync; account deletion; sandbox purchase (V1) |
| Accessibility | Manual checklist (A11Y-14) | Every release |
| Performance | Reference devices (§15.1) | Startup, session frame rate, memory; every release |
| Beta | TestFlight, Play internal and closed testing | Before every native release |

### 21.2 CI/CD
- **Pull request:** GitHub Actions runs `pnpm verify` (typecheck, lint, format check, unit and component tests) as a required check (ADR 0071), with a fingerprint diff that flags native changes.
- **Main branch:** GitHub Actions deploys the API; EAS Workflows makes preview builds and runs the Maestro end-to-end tests.
- **Release:**
  1. Production build.
  2. Submit to the stores.
  3. **Phased release** on the App Store and a **staged rollout** on Google Play.
- **OTA updates:**
  - Use EAS Update channels (`preview`, `production`) for JavaScript and asset fixes only, with fingerprint runtime versions and a documented rollback.
  - Remote-config kill switches exist, plus a forced-update screen below `minAppVersion`. It takes over at the next safe moment, never during a quiz or its results, and goes by the last config the device saw, offline too. Update opens the server's `updateUrl`, or the store.
- **Environments:** `development` (the fake server or a local API), `preview` (staging), `production`. Configuration lives in `app.config.ts` plus EAS environment variables, with no secrets in the client.
- **Cadence:** a native release every 2–4 weeks, and OTA updates as needed.

---

## 22. Roadmap and phase gates

The calendar is the roadmap's (ADR 0074). Its §5 sets the phases and gates of P0 and the MVP: foundations and design in weeks 1 to 3 (gates G0 and G1), the daily end to end in weeks 4 to 6 (G2), MVP breadth in weeks 7 to 12, hardening and beta in weeks 13 to 15 (G3), and soft launch in weeks 16 to 21 (G4). The durations in version 1.0 of this section no longer apply; the scope below does. V1 is planned in detail only after G4.

### P0: Foundations (roadmap phases 0 and 1)
- **Brand and design:**
  - brand direction, name and mascot concept (DS-01, ADR 0077);
  - **design tokens** (§12);
  - core components in the gallery route (§12.9).
- **Validation:**
  - a clickable prototype of the daily loop;
  - at least 5 people across the personas (§4) try it before G1, and the findings are folded into the screens; more sessions follow on real builds in phase 2 (ADR 0078).
- **Engineering setup:**
  - monorepo and an Expo SDK 58 skeleton;
  - CI;
  - `contracts` v0 and its fake server;
  - `quiz-engine` with the 5 MVP question types;
  - the API foundations and the internal review tool, beside design (roadmap §2).
- **Content:** taxonomy and editorial guidelines. The first 500 reviewed questions moved into the MVP content target (owner, 2026-09-30).

### MVP (roadmap phases 2 to 5)
- **Onboarding:** guest mode, onboarding and the age gate (ONB-01…09).
- **Daily loop:**
  - Global Daily and Daily 5 (DLY, D5-01);
  - streaks with earned freezes (STK-01…04, 06);
  - XP, levels and daily goal (XP).
- **Play:**
  - session engine (§10), 5 question types, Standard and Relaxed modes;
  - explanations, sources and reporting;
  - results, review and share card.
- **Social:** async challenges with universal links, and blocking.
- **Profile and settings:** profile basics; settings, including accessibility and account deletion.
- **Notifications:** primer, channels and local streak reminders.
- **Foundations:**
  - offline dailies and the outbox;
  - full accessibility (§13) and localization infrastructure (§14);
  - analytics, crash reporting, remote config, forced updates.
- **Web:** share pages and marketing/legal pages.
- **Content:** ≥ 3,000 reviewed questions and ≥ 60 days of daily sets.
- **Soft launch:** 1–2 English-speaking markets for 4–6 weeks of measurement.

**Gate to V1 (roadmap G4):** D1 ≥ 35%, D7 ≥ 15%, crash-free ≥ 99.5%, Global Daily completion ≥ 85%.

### V1
- **Competition and social:** leagues; friends and activity; ghost races; reactions.
- **Retention:** streak calendar, repair and bought freezes; mistakes deck and spaced repetition; seasons.
- **Money:** coins, Premium and RevenueCat.
- **Creator:** **private creator tools**.
- **Platform:**
  - iOS widgets and app shortcuts;
  - deferred deep links and in-browser play;
  - tablet layouts.
- **Play and content:** four more question types; lifelines; the first localized languages.

**Gate to V2:** D30 ≥ 8%, DAU/MAU ≥ 20%, measured trial conversion.

### V2
- **Creators:**
  - public UGC with moderation;
  - AI assist and scan-to-quiz; CSV import;
  - verified creators.
- **Social:** groups; friend streaks.
- **Live:** live events and Live Activities; App Clip.
- **Other:** Knowledge Map; Android widgets; device attestation.

### V3
- Real-time 1v1 matchmaking and large live rooms.
- Recommendations based on embeddings.
- Creator incentives.
- A web editor.

---

## 23. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Horizontal positioning with no beachhead** | Weak marketing and a vague brand | The daily loop is the brand. Market first to students, who share fastest, and to trivia fans. Track which personas retain best and double down. |
| **Content breadth and quality across every field** | Thin or wrong content, lost trust | Curated seed bank, an AI-draft plus human-review pipeline, sources required, auto-suspension on reports, creators from V1 |
| **Retention mechanics feel manipulative** | Churn, bad reviews | Principle 5: freezes and repairs, no energy gates, capped notifications, quiet hours |
| **Scope larger than the team** | Delays, burnout | Phase gates, a strict MVP, flags, and managed services everywhere |
| **The app and the API drift apart** | Mismatched shapes; an older app breaks on a newer API | Every endpoint is a `contracts` schema first; the app validates every response (ADR 0041); one suite runs against the fake server and the real API; `minAppVersion` as the last resort |
| **Cheating** | Leagues and challenges lose meaning | Integrity tiers, plausibility checks, attestation (V2), XP caps |
| **UGC moderation load** | Policy violations, store rejection | Private-first UGC, automated plus human review, report SLAs, no free-text social |
| **Performance on low-end Android** | Poor ratings in key markets | Budgets tied to reference devices, UI-thread animation, measurement every release |
| **Platform policy and legal change** (payments, age rules) | Rework | Isolate purchases behind RevenueCat, track guideline changes, age gate from day one |
| **Dependencies moving to new SDKs** | Upgrade churn | Stay on current SDKs, pin versions, a fingerprint check in CI, an upgrade window in each phase |

---

## 24. Out of scope

| Item | Reason |
|---|---|
| AR quizzes | Novelty with no loop value; high cost |
| Forums, DMs, free-text chat | Moderation cost and child safety |
| Support chatbot | FAQ plus contact is enough at this scale |
| AI natural-language search | Postgres search is sufficient; revisit with data |
| Microservices, Kafka, RabbitMQ | Premature at this scale; one container image runs the API and the worker (ADR 0051) |
| A separate Next.js web app or full web parity | Expo Router covers the needed web surfaces |
| Pagination controls | Mobile uses infinite lists |
| Interstitial and banner ads | Conflict with the "smooth" priority |
| Lives and energy systems | Conflict with Principle 5 |
| Hosted live shows (HQ Trivia style) | Cost model; scheduled automated events cover the need |

---

## 25. Open questions

| # | Question | Needed by | State |
|---|---|---|---|
| Q1 | App name, brand personality and mascot concept | P0 | Answered: decided in DS-01, with a trademark check before any store upload (ADR 0077) |
| Q2 | Soft-launch markets, and the first languages after English | Markets: FND-04, because they fix the hosting region (roadmap O-5). Languages: MVP end | Open |
| Q3 | Final minimum OS versions for SDK 58 (SDK 56+ requires iOS 16.4) and the Android minimum API level | P0 | Answered: iOS 16.4 and Android `minSdk` 24, unless the owner raises the floor (ADR 0030) |
| Q4 | Premium price points and the content of the trial | V1 | Open |
| Q5 | Whether "Create" becomes a tab | V2 | Open |
| Q6 | Whether to ever offer an under-13 / kids mode | Post-V2 | Open |
| Q7 | Final auth provider | Before backend integration | Answered: Better Auth (ADR 0057) |
| Q8 | Where the Global Daily comes from (in-house editorial, contributors, licensed banks) and licensing terms | P0 | Open (roadmap O-4) |
| Q9 | Creator incentives (revenue share, featuring, badges only) | V2 | Open |
| Q10 | Whether a self-declared birth year (ONB-06) is enough for a 13+ app with usernames under the new age-assurance laws, or whether the platforms' age signals (`expo-age-range`) must be added | Counsel's view by M5 (roadmap O-7) | Open (ADR 0076) |

---

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| **Session** | One play-through of any source (quiz, daily, challenge, review, live) |
| **Global Daily** | The single daily set that is identical for every user |
| **Daily 5** | The personalized daily set of 5 questions |
| **Qualifying session** | A session that extends the streak (STK-01) |
| **Streak freeze / repair** | Automatic protection for a missed day / paid restoration after a break |
| **Cohort** | A group of up to 30 users competing in a weekly league |
| **Ghost** | A recorded run by a real player, used as an opponent |
| **Integrity tier** | Where grading and timing are trusted (A: server; B: device, server-validated) |
| **Mistakes deck** | The user's missed questions, resurfaced with spaced repetition |
| **Knowledge Map** | A visualization of the user's mastery across domains |
| **Block (content)** | A structured piece of question content: paragraph, math, code, image, audio |
| **Outbox** | The local queue of results waiting to sync |

## Appendix B: Corrections to the original brainstorm

- **QuizUp** shut down in March 2021. It is not a current competitor.
- **User-generated content is not a market gap.** Kahoot is largely user-created, and Sporcle has more than 2 million user-made quizzes.
- **Brainly** is homework Q&A, not a quiz app. The relevant benchmarks are Duolingo, Quizlet, Wayground (formerly Quizizz), Sporcle, NYT Games/Wordle and Trivia Crack.
- **A separate React/Next.js web app is unnecessary.** Expo Router targets the web.
- **Use Postgres, not MongoDB.** The data is relational.
- **Microservices, Kafka and RabbitMQ are premature**, and a second backend language (Python) adds cost.
- **Payment gateways can't sell digital goods in the app.** Use StoreKit and Play Billing (via RevenueCat).
- **The frontend optimization list was web-centric.** It is replaced by §15. `useMemo` and `useCallback` are largely handled by React Compiler.
- **"Minimalist with ample white space"** conflicted with the rich-color priority. It is replaced by §12.
- **"Follow WCAG"** is replaced by the mobile-specific §13, including adjustable timing.
- **Global and regional rankings are replaced by weekly leagues.** Global boards demotivate most users.
- **"AI adaptive difficulty"** is replaced by Glicko-2 ratings for players and questions (§11.5).
- **Missing entirely from the original:** retention design, anti-cheat, store compliance (guidelines 1.2 and 5.1.1(v)), onboarding, offline support, localization and admin tooling.

## Appendix C: Sources

The Expo facts of version 1.0 were checked on 2026-09-27 against the links below. Version 1.1's versions come from roadmap §3.1, checked on 2026-11-14.
- Expo SDK 58 beta: https://expo.dev/changelog/sdk-58-beta
- Expo SDK 57: https://expo.dev/changelog/sdk-57
- Expo SDK 56: https://expo.dev/changelog/sdk-56
- Expo SDK 55 (New Architecture only, `expo-av` removed): https://expo.dev/changelog/sdk-55
- Native tabs: https://docs.expo.dev/router/advanced/native-tabs/
- Link previews: https://docs.expo.dev/router/advanced/link-preview/
- Modals and form sheets: https://docs.expo.dev/router/advanced/modals/
- `@expo/ui`: https://docs.expo.dev/versions/latest/sdk/ui/
- `expo-glass-effect`: https://docs.expo.dev/versions/latest/sdk/glass-effect/
- EAS Hosting: https://docs.expo.dev/eas/hosting/introduction/
- EAS Workflows E2E: https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- EAS Observe GA: https://expo.dev/changelog/eas-observe-is-now-generally-available
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

## Appendix D: Changes in version 1.1

Version 1.1 (2026-11-23, ticket FND-06) brings the spec in line with roadmap v1.1 and the ADRs in `docs/adr/`. No requirement ID was added, renumbered or retired.

| Source | What changed | Where |
|---|---|---|
| Roadmap A1, ADR 0030 | Start on Expo SDK 58; the platform floor is iOS 16.4 and Android `minSdk` 24 | D4, §18.1, §18.2, §22, Q3 |
| A2, ADR 0072 | The API is built now, in this monorepo, contract first; running costs start in Phase 0 | Header, D5, §7.14, §18.3, §19, §23, §24, Q7 |
| A3, ADR 0073 | A revocable server-side session and a device-held secret replace access and refresh tokens | SEC-02, §18.2, §18.5, §19.2 |
| A4, ADR 0042 | An in-process fake server replaces MSW | §18.2, §18.4, §19.6, §21.2, §22, §23 |
| A5, ADR 0043 | A gallery route in the app replaces Storybook | §12.9, §18.2, §21.1, §22 |
| A6, ADR 0056 | No Redis or Valkey at MVP | §19.1 |
| A7, ADR 0041 | A client driven by the endpoint registry validates every response; `hc` only in the admin console | D5, §18.2, §18.3, §23 |
| A8, ADR 0035 | The timer ring is SVG; Skia draws confetti and share cards only | §18.2 |
| A9, ADR 0074 | Roadmap §5 sets the calendar; §22 keeps the scope | Conventions, §22, §23, §24 |
| A10, ADR 0075 | Citations of an earlier codebase's ADRs 0008 to 0012 replaced or removed | 24 places from the conventions to §21 |
| A11, ADR 0076 | ONB-06 unchanged; age assurance is an open question for counsel | §7.1, Q10 |
| A12, ADR 0077 | The name and mascot are decided in DS-01 | Header, §22, Q1 |
| A13, ADR 0078 | At least 5 people try the prototype before G1 | §22 |
| ADR 0002 | Shared packages are unit-tested with Vitest | §18.2, §21.1 |
| ADR 0003 | No limit on time-zone changes | STK-03 |
| ADR 0004 | Qualifying sessions, freezes, best streak, the level curve, session and Practice XP, the offline cap, the goal ring | STK-01, STK-04, §6.3, XP-01 to XP-04, §6.4, PLAY-02 |
| ADRs 0008, 0022 | Inline links; the alt text and transcript a device renders are the block's | §11.1, §11.3 |
| ADR 0024 (S1, S5) | The Global Daily's body has its own URL; the client sends its UTC offset | §10.1, §19.2, §19.3 |
| Owner's ruling, 2026-11-21 (EG-33) | Typed answers are exact by default | QT-03 |
| ADRs 0036, 0045, 0048, 0050 to 0062, 0065, 0068 to 0071 | Lists, monitoring, lint, CI, the API stack, generated usernames, the admin console, tests | D3, ONB-07, §7.14, §15.3, §18.2, §18.6, §19.1, §20, §21 |
| Roadmap §3.2, §4.2, §4.3 and the DS-04 and FE-15 rows | The mascot stays static until Rive suits Unistyles; the repository layout; server re-grading; the four `DailyCard` states; Continue for any resumable session | §9.1, §10.1, §10.6, §12.8, §12.9, §18.2 to §18.4 |
