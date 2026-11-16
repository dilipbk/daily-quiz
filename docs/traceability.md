# Traceability: MVP requirements to tickets

Every requirement the spec marks for the MVP, and the ticket or tickets in `docs/roadmap.md` that deliver it. The PM checks a ticket against its rows at review, and checks every row at gate G3.

- A requirement the spec splits across phases is listed with its MVP part only.
- Requirements for V1 and later aren't listed. Adding one to the MVP is a roadmap change the owner approves.
- **Status** is `todo`, `built` or `verified`. Only the PM sets `verified`.

## Daily loop and retention (spec §6)

| Requirement | MVP scope | Tickets | Status |
|---|---|---|---|
| DLY-01 | One Global Daily per date, 8 questions, ≥ 5 domains, easy to hard | BE-05, CT-04 | todo |
| DLY-02 | Unlocks at local midnight; same set everywhere | BE-05, FE-06 | todo |
| DLY-03 | One scored attempt; practice replay with no XP | FE-06, FE-15 | todo |
| DLY-04 | Today card: available, in progress, completed, next unlock | FE-06 | todo |
| DLY-05 | Spoiler-free share card, image and text | FE-18 | todo |
| DLY-06 | Global percentile after completion | BE-06, FE-06 | todo |
| DLY-07 | Today and tomorrow prefetched | BE-05, FE-07 | todo |
| DLY-08 | Editorially reviewed questions only | CT-02, BE-05, CMS-01 | todo |
| D5-01 | Daily 5 from interests, ~70% predicted success | BE-18, FE-12 | todo |
| D5-02 | Either daily counts toward streak and goal | BE-18, FE-12 | todo |
| STK-01 | Streak increments once per local day on a qualifying session | ENG-03, BE-06 | todo |
| STK-02 | Server authoritative; client optimistic | BE-06, FE-07 | todo |
| STK-03 | Local-day boundary, time-zone credit limit, DST safe | ENG-03, BE-06 | todo |
| STK-04 | Automatic freeze, hold up to 2, earned at milestones | ENG-03, BE-11 | todo |
| STK-06 | Milestone celebrations and badges | ENG-03, BE-11, FE-12 | todo |
| XP-01 | XP formula | ENG-03, BE-06 | todo |
| XP-02 | Levels and level-up celebration | ENG-03, BE-11, FE-12 | todo |
| XP-03 | Daily goal ring | ENG-03, BE-11, FE-12 | todo |
| XP-04 | Offline XP capped until validated | ENG-03, BE-06, FE-07 | todo |
| CHL-01 | Async 1v1 with comparison | BE-15, FE-17 | todo |
| CHL-02 | Universal links with a web fallback | WB-01 | todo |
| CHL-03 | "Your turn" inbox; 72-hour expiry | BE-15, FE-17 | todo |
| CHL-05 | Rematch and challenge back in one tap | BE-15, FE-17 | todo |
| BDG-01 | Core badge set of about 15 | BE-11, BE-15, FE-12, DS-12 | todo |

## Features (spec §7)

| Requirement | MVP scope | Tickets | Status |
|---|---|---|---|
| ONB-01 | First-launch flow; first question within 30 s | BE-10, FE-10 | todo |
| ONB-02 | Guest mode on a server-side guest account | BE-03, FE-05, FE-10 | todo |
| ONB-03 | Account prompts at moments of value | FE-11, FE-12, FE-17 | todo |
| ONB-04 | Apple, Google, email magic link | BE-16, FE-11 | todo |
| ONB-05 | Guest upgrade keeps progress | BE-16, FE-11 | todo |
| ONB-06 | Neutral age screen; under 13 can't proceed | BE-10, FE-10 | todo |
| ONB-07 | Username check and filter; basic avatar | BE-17, FE-11 | todo |
| ONB-08 | New device restores progress | BE-16, FE-11 | todo |
| ONB-09 | Account deletion in the app | BE-17, FE-11 | todo |
| EXP-01 | Explore: search, chips, category grid, collections | FE-14, CT-05 | todo |
| EXP-02 | Domain to topic to quiz list | BE-13, FE-14 | todo |
| EXP-03 | Typo-tolerant search with recents and suggestions | BE-19, FE-14 | todo |
| EXP-04 | Filters as chips or a sheet | FE-14 | todo |
| EXP-05 | Virtualized infinite lists with skeletons | BE-13, FE-14 | todo |
| EXP-06 | Rule-based ranking with ~20% exploration | BE-19 | todo |
| PLAY-01 | Quiz detail | FE-15 | todo |
| PLAY-02 | Standard, Relaxed, Practice | BE-13, FE-15 | todo |
| PLAY-03 | Sessions follow spec §10 | FE-03 | todo |
| PLAY-05 | Report a question from its explanation | BE-14, FE-16 | todo |
| PLAY-06 | Explanation and sources on every question | FE-02, CT-02 | todo |
| PLAY-07 | Leave confirmation; resume | FE-03, FE-15 | todo |
| QT-01 | Question types as registry modules | ENG-02, FE-04 | todo |
| QT-02 | Deterministic graders on shared fixtures | ENG-02 | built |
| QT-03 | `type_answer` normalization | ENG-02 | built |
| QT-04 | Rich content blocks everywhere | ENG-01, FE-04 | todo |
| QT-05 | Keyboard and screen-reader operation | FE-04 | todo |
| RES-01 | Results sequence | FE-12 | todo |
| RES-02 | Next quiz, Review, Share, Challenge | FE-16 | todo |
| RES-03 | Review screen | FE-16 | todo |
| RES-05 | Pending-sync indicator | FE-06 | todo |
| PRF-01 | Profile basics | FE-19 | todo |
| PRF-05 | Basic avatar builder | FE-11, DS-12 | todo |
| SOC-03 | Block user | BE-15, FE-17 | todo |
| SOC-04 | No free text between users | Roadmap §7 guardrail | todo |
| NTF-01 | Permission only after the first quiz, with a primer | FE-13 | todo |
| NTF-02 | Channels and categories with toggles | BE-12, FE-13 | todo |
| NTF-03 | Local streak reminder | FE-13 | todo |
| NTF-04 | Quiet hours | BE-12, FE-13 | todo |
| NTF-05 | Notification actions deep-link into a session | FE-13, WB-01 | todo |
| MON-04 | Purchases never affect ranked outcomes | Roadmap §7 guardrail | todo |
| SAFE-01 | Report on quiz, question and profile | BE-14, FE-16 | todo |
| SAFE-02 | Blocking | BE-15, FE-17 | todo |
| SAFE-03 | User text filtered before anyone sees it | BE-17 | todo |
| SAFE-04 | Published support contact | WB-02, FE-20, QA-03 | todo |
| SAFE-05 | Reports acknowledged; 48-hour target | BE-14, FE-16, CMS-02 | todo |
| SAFE-07 | Accuracy pipeline and auto-suspension | CT-02, BE-14, CMS-01 | todo |
| WEB-01 | Share pages with Open Graph image | WB-01 | todo |
| WEB-03 | Landing and legal pages | WB-02 | todo |
| ADM-01 | Question bank CMS, minimal | CMS-01 | todo |
| ADM-02 | Daily-set scheduler with 14-day preview | CMS-02 | todo |
| ADM-03 | Moderation queue for reports | CMS-02 | todo |
| ADM-04 | Remote config and feature flags | BE-01, CMS-02 | todo |

## Accessibility and localization (spec §13, §14)

| Requirement | MVP scope | Tickets | Status |
|---|---|---|---|
| A11Y-01 | Role, label and state on every control | FE-02 | todo |
| A11Y-02 | Focus moves to the question; result announced | FE-03 | todo |
| A11Y-03 | Reflow to the largest text sizes | DS-09, FE-02 | todo |
| A11Y-04 | Reduce Motion; timer as text | FE-02, FE-03 | todo |
| A11Y-05 | Colour never the only signal | DS-03, FE-02 | todo |
| A11Y-06 | Contrast in both themes | DS-03, FE-02 | todo |
| A11Y-07 | Touch target sizes | DS-03, FE-02 | todo |
| A11Y-08 | Untimed and Extended timing | FE-03, FE-20 | todo |
| A11Y-09 | Alternatives to drag | FE-04 | todo |
| A11Y-10 | Alt text and transcripts enforced | CT-02, CMS-01 | todo |
| A11Y-11 | Hardware keyboard | FE-04 | todo |
| A11Y-12 | Dyslexia font, high contrast, larger buttons | DS-03, FE-20 | todo |
| A11Y-13 | Sound never essential alone | FE-03 | todo |
| A11Y-14 | Release checklist | QA-04 | todo |
| L10N-01 | Every string externalized | FE-01 | todo |
| L10N-02 | Pseudo-localization build | FE-01, QA-05 | todo |
| L10N-03 | Language follows the device, with an override | FE-01, FE-20 | todo |
| L10N-06 | Region tags on questions | CT-02, BE-13 | todo |
| L10N-09 | `Intl` formatting | FE-01 | todo |
| L10N-11 | Launch in English | CT-06, REL-01 | todo |

## Offline, security and privacy (spec §16, §17)

| Requirement | MVP scope | Tickets | Status |
|---|---|---|---|
| OFF-01 | Dailies prefetched | BE-05, BE-18, FE-07, FE-12 | todo |
| OFF-03 | Outbox with idempotency keys | FE-07, BE-06 | todo |
| OFF-04 | Streak credited from the completion timestamp | BE-06, FE-07 | todo |
| OFF-06 | Offline indicator never blocks | FE-05 | todo |
| OFF-07 | Query cache persisted and restored | FE-05 | todo |
| SEC-01 | No secrets in the bundle | FND-04, QA-08 | todo |
| SEC-02 | Tokens in SecureStore (amended: roadmap A3) | BE-03, FE-05 | todo |
| SEC-03 | Integrity tiers enforced | BE-06, QA-08 | todo |
| SEC-05 | Plausibility checks on Tier B | BE-06 | todo |
| SEC-06 | 429 and `Retry-After` handled | FE-05 | todo |
| SEC-07 | Deep links validated; never act without a tap | WB-01, QA-08 | todo |
| SEC-08 | Structured blocks only; https links | ENG-01, FE-04 | todo |
| PRIV-01 | Age gate 13+ | BE-10, FE-10 | todo |
| PRIV-02 | Account deletion in the app | BE-17, FE-11 | todo |
| PRIV-04 | Analytics consent | FE-20, FE-21 | todo |
| PRIV-05 | Privacy manifest, labels, Data safety form | QA-03 | todo |
| PRIV-06 | Sign in with Apple beside Google | BE-16, FE-11 | todo |
| PRIV-07 | UGC requirements before any user text is visible | BE-17, BE-14, BE-15, QA-03 | todo |
| PRIV-08 | Minimal data collection | BE-02, QA-08 | todo |
| PRIV-09 | Terms, privacy policy and guidelines in the app | WB-02, FE-20 | todo |

## MVP scope without a requirement ID

| Spec section | Scope | Tickets | Status |
|---|---|---|---|
| §7.11 | Settings groups | FE-20 | todo |
| §10 | Session engine: states, timing, rhythm, scoring, persistence, preloading | ENG-02, FE-03 | todo |
| §11.1–11.3 | Content model, versioning, rich blocks | ENG-01, BE-04 | todo |
| §11.5 | Ratings and the ~70% target | BE-18 | todo |
| §11.6 | ≥ 3,000 reviewed questions; ≥ 60 days of dailies | CT-03, CT-04, CT-05, CT-06 | todo |
| §12 | Design system and components | DS-03, DS-11, DS-12, FE-02, FE-12 | todo |
| §15 | Performance budgets | QA-01, QA-06 | todo |
| §19.6 | Fake server and scenario switcher | FE-05 | todo |
| §20 | Analytics events and funnels | FE-21 | todo |
| §21.1 | Test layers and end-to-end flows | QA-01, QA-07 | todo |
| §21.2 | CI/CD, updates, forced update | FND-02, FND-07, QA-02, FE-01, FE-21 | todo |
