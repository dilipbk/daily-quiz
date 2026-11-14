# Delivery roadmap

| | |
|---|---|
| **Version** | 1.1, approved by the owner on 2026-11-14. |
| **Date** | 2026-11-14 |
| **Maintained by** | PM / PO |
| **Inputs** | `docs/spec.md` v1.0 (2026-09-27); stack research against primary sources on 2026-11-14 |
| **Covers** | Everything from an empty repository to soft launch (the spec's MVP), then the path to V1: design, mobile app, API, admin console, web pages and content. |

**How to read this.** §1 and §2 say what the plan protects. §3 holds the decisions that set direction. §5 and §6 are the plan itself: phases, gates and tickets. §7 is the definition of done for every ticket. §8 lists what only the owner can decide or do.

Where this roadmap and the spec disagree, §3.3 lists the difference, and the roadmap wins until the spec is revised (FND-06).

---

## 1. What we are building, and what must be true at launch

A daily knowledge habit: two minutes a day, for anyone curious. The owner's top goal is that people come back tomorrow (spec D6).

Five things make the app worth choosing (spec §2). The roadmap is ordered to prove them early.

| # | Differentiator | Where the roadmap proves it |
|---|---|---|
| 1 | A daily ritual: Global Daily, Daily 5, streaks, challenges | Phase 2 builds the Global Daily end to end before anything else |
| 2 | A premium feel: native, fast, tactile | Design is complete before any screen is built; performance budgets block releases from Phase 2 on |
| 3 | Question formats for every field | The question-type registry and rich content blocks are foundations (Phase 0) |
| 4 | Learning, not only scoring | Explanations and sources ship with the first playable question; content review starts in week 1 |
| 5 | Personal | Daily 5 and ratings arrive in Phase 3 (M2) |

**Launch means** the soft-launch gates in spec §3 can be measured: D1 ≥ 35%, D7 ≥ 15%, Global Daily completion ≥ 85%, crash-free sessions ≥ 99.5%, weekly active days ≥ 3.0.

---

## 2. Shape of the plan

Six rules explain every sequencing choice below.

1. **Design first.** No screen and no player-facing behaviour is built before the design gate (G1). Work that design cannot change runs beside it: the repository, pipelines, pure logic packages, content, the API foundations (skeleton, schema, identity, content store) and the internal review tool. The owner approved that last group on 2026-11-14.
2. **The daily loop first.** After G1 the team builds one thin slice (open the app, play the Global Daily, watch the streak go up) on the real API, with real content, on real devices, and holds it to the performance budgets. Breadth comes after that slice feels right.
3. **Backend now, not later.** The spec planned the backend as a later project for a solo developer (D5). With a team, the larger risk is an app built on assumptions. Streaks, XP and results are server-authoritative, so the loop can't be trusted until the server exists.
4. **Contract first.** Every endpoint is a zod schema in `packages/contracts` before either side implements it. The app, the API and the fake server all parse with the same schemas.
5. **Content is the critical path.** Launch needs ≥ 3,000 human-reviewed questions and ≥ 60 days of daily sets (spec §11.6). Drafting can run in parallel; human review can't. Content starts in week 1 and the review tool is built early.
6. **Boring, portable infrastructure.** One container, plain Postgres, a CDN. Nothing the product couldn't leave in a day.

---

## 3. Decisions

### 3.1 Stack

Versions were verified on npm and vendor docs on 2026-11-14. They are a starting point: check the official docs again on the day you install, and install Expo-managed packages with `npx expo install` so they match the SDK's pins.

**Mobile app (`apps/mobile`)**

| Concern | Choice | Note |
|---|---|---|
| Framework | Expo SDK 58 (58.0.25), React Native 0.88, React 19.3, development builds, TypeScript ~6.0 strict | SDK 58 has been stable since 2026-10-15. It already meets Apple's April 2027 SDK rule. |
| Navigation | Expo Router with NativeTabs (`expo-router/native-tabs`, now stable), native stack, form sheets | |
| Native UI | `@expo/ui`, `expo-symbols`, `expo-glass-effect` | Native chrome, branded content (spec D9) |
| Styling and themes | Unistyles 3.8 on Nitro 0.37 | Themes switch from C++ without re-rendering. Light, dark and high contrast come from `packages/design-tokens`. |
| Animation and gestures | Reanimated 4.7 with Worklets 0.13, Gesture Handler at the SDK's pin | |
| Graphics | Skia 2.14 (`@shopify/react-native-skia`), loaded lazily, for confetti and share cards only | The timer ring is `react-native-svg` plus Reanimated. |
| Lists | FlashList 2.3 | Legend List is the fallback. |
| Session state | XState 5, behind our own versioned persistence adapter | XState 6 is in beta and changes persistence. |
| Server state | TanStack Query 5, persisted to MMKV | |
| App and UI state | Zustand 5 | |
| Storage | MMKV 4.3 for key-value, query cache and the outbox (one key per entry); `expo-secure-store` for tokens | SQLite arrives in V1 with offline packs. |
| API client | A thin client driven by the `contracts` endpoint registry that validates every response at runtime | App binaries lag the server, so types alone aren't enough. |
| Mocks | An in-process fake server injected at the client's transport, shared with tests | Replaces MSW, which has no working React Native path today. |
| Component workbench | A development-only gallery route in the app: every component in every state × theme × text size | Replaces Storybook for now; its on-device UI is broken on current React Native. Revisit at V1. |
| i18n | `expo-localization`, i18next 27 with ICU | |
| Auth (device) | Better Auth Expo client, `expo-apple-authentication`, Google sign-in | First integration is tested in BE-03; Better Auth's Expo guide targets an older SDK. |
| Notifications | `expo-notifications`, Expo push service | |
| Analytics and flags | PostHog | |
| Crashes and performance | Sentry for crashes; EAS Observe for startup and navigation timing | Observe doesn't replace Sentry yet. |
| Updates | `expo-updates`, EAS Update, fingerprint runtime versions | |
| Tests | Jest 30 with `jest-expo` 58, React Native Testing Library 14.1, Maestro on EAS Workflows | |

**API and data (`apps/api`)**

| Concern | Choice | Note |
|---|---|---|
| Framework and runtime | Hono 4.13 on Node 26 LTS; one container image running an API process and a worker process | Web-standard handlers keep it portable. Hono 5 is a release candidate: stay on 4. |
| Hosting | Fly.io, at least two machines, in the region nearest the soft-launch market and the database | A container and Postgres, so the host is replaceable. |
| Database | Postgres on Neon (point-in-time recovery, a branch per pull request) | PlanetScale Postgres is the scale-up fallback. |
| Data access | Drizzle 0.45, SQL-style builder only | Joins, locks and transactions stay explicit. Move to 1.0 before the first production migration if it is stable by then. |
| Jobs and schedules | pg-boss 12, in the same database | Jobs are enqueued inside the business transaction. |
| Cache and rate limits | Postgres plus the CDN. No Redis at MVP. | A league cohort of 30 is an indexed query. Redis is reconsidered for live events (V2). |
| Auth | Better Auth 1.7, pinned exactly: anonymous (guest) plugin, account linking, Apple, Google, magic link | All game data is keyed to our own `player_id`. |
| Email | A transactional email service for magic links, chosen in BE-16 from current docs and recorded as an ADR | Not chosen yet. |
| Media | Cloudflare R2; AVIF and WebP variants generated at publish | The 150 KB limit is a publish gate. |
| Edge | Cloudflare in front: CDN, WAF, per-IP rate limits | |
| Search | Postgres full-text search with `pg_trgm` and `unaccent` | |
| Moderation | Generated default usernames, a blocklist, and OpenAI moderation behind our own interface; failures go to a review queue | |
| Publish-time rendering | MathJax to SVG, Shiki for code tokens, `sharp` for images | |
| Errors | RFC 9457 problem details with stable codes, from one error handler | |
| Tests | Vitest 5 against real Postgres (Testcontainers) | |
| Observability | Sentry, structured logs with a request id, uptime and cron monitors | |

**Web, admin and tooling**

| Concern | Choice | Note |
|---|---|---|
| Web share, landing and legal pages | Expo Router web with server output on EAS Hosting; Open Graph tags from `generateMetadata()`; share images rendered by the API | Keeps the session UI reusable for in-browser play in V1. |
| Admin console (`apps/admin`) | React Admin SPA on `/admin/*` routes of the same API | Reuses the shared validators and graders. The player preview is the app's web build in a frame. |
| Monorepo | pnpm 11 workspaces, Node ≥ 22.13 | The EAS build image ships pnpm 11. FND-01 fixes one Node version for the workspace. |
| Lint and format | ESLint 9, Prettier | `eslint-config-expo` doesn't support ESLint 10 yet. |
| CI/CD | GitHub Actions for checks and API deploys; EAS Build, Submit, Update and Workflows for the app | |

### 3.2 Alternatives considered

| Decision | Rejected | Why |
|---|---|---|
| Hosting | Cloudflare Workers | The completion write path is a multi-statement transaction with row locks, and jobs must be enqueued inside it. Workers' pooled connections and queues fit that poorly. |
| Framework | Fastify, Elysia, NestJS, tRPC/oRPC | Fastify is a sound fallback. Elysia ties us to Bun, Nest is heavy, and RPC frameworks fight ETag caching, idempotency keys and webhooks. |
| Database | Supabase, Aurora | Supabase charges far more for point-in-time recovery; Aurora is more operations than this team needs. |
| Jobs | BullMQ, Inngest, Trigger.dev | BullMQ needs Redis; the hosted services add cost and a second place where state lives. |
| Styling | NativeWind, plain StyleSheet | NativeWind's Tailwind 4 version isn't stable; StyleSheet with context re-renders on theme change. |
| Web pages | HTML rendered by the API | Simpler today, but the spec needs question types to work on the web (QT-05, A11Y-11) and in-browser play in V1, so web support has to be honest from the start. |
| Mascot runtime | Rive | Its Nitro version range conflicts with Unistyles today. The mascot stays static until that clears (re-check at V1). |

### 3.3 Spec amendments

| # | Spec says | Roadmap says | Reason |
|---|---|---|---|
| A1 | Start on SDK 57, move to 58 when stable (D4, §18.1) | Start on SDK 58 | Stable since 2026-10-15 |
| A2 | Backend is a separate, later project (D5) | The API is built now, in this monorepo | §2 rule 3 |
| A3 | Short-lived access tokens with rotating refresh tokens (SEC-02, §19.2) | Revocable server-side sessions, held in SecureStore | That is how Better Auth works. A guest's identity must outlive any session: see §4.3. |
| A4 | MSW mocks (§18.2, §19.6) | In-process fake server with the same scenarios | §3.1 |
| A5 | Storybook for React Native (§12.9, §18.2, §21.1) | In-app gallery route with the same state × theme × text-size matrix | §3.1 |
| A6 | Redis or Valkey for leagues and rate limits (§19.1) | None until V2 | §3.1 |
| A7 | Hono `hc` client or a fetch wrapper (§18.2) | Registry-driven validating client; `hc` only for the admin console | §3.1 |
| A8 | Skia draws the timer ring (§18.2) | SVG plus Reanimated; Skia for confetti and share cards | Smaller startup cost |
| A9 | P0 of 3–4 weeks and an MVP of 4–5 months, solo (§22) | The phases in §5 | A team working in parallel |
| A10 | ADR 0008–0012 are cited throughout | This repository starts its own ADR series; FND-06 renumbers the references | Those ADRs belong to an earlier codebase. The behaviours they describe are restated in the spec text. |
| A11 | A neutral birth-year age screen (ONB-06) | Unchanged for now; `expo-age-range` and new age-assurance laws are an open question for counsel (O-7) | New since the spec |
| A12 | Brand name and mascot are open (Q1) | Decided in DS-01, with a trademark check before any store upload | A bundle identifier is permanent once uploaded |
| A13 | 10–15 interviews across the personas (§22, P0) | At least 5 prototype sessions before G1; more sessions follow on real builds in Phase 2 | Enough to catch the large usability problems without holding the gate |

---

## 4. System design

### 4.1 Overview

```
 iOS and Android app ─┐
 Web share pages ─────┼─▶ Cloudflare (CDN, WAF, per-IP limits) ─▶ API  (Hono, Fly.io, ≥ 2 machines)
 Admin console ───────┘                                            │
                                                                   ├─▶ Postgres (Neon): the source of truth
                                                                   │      └─ pg-boss job tables
                                                                   ├─▶ Worker (same image): jobs and schedules
                                                                   └─▶ R2: media and pre-rendered variants ─▶ CDN
```

### 4.2 Repository layout

```
/
├── apps/
│   ├── mobile/            Expo app: iOS, Android, web share and marketing pages
│   ├── api/               Hono API and worker
│   └── admin/             React Admin console (internal)
├── packages/
│   ├── contracts/         zod schemas, endpoint registry, error codes, fixtures, fake server
│   ├── quiz-engine/       question-type schemas, graders, normalization, scoring
│   ├── game-rules/        streak and day-boundary logic, XP, levels, badge rules (pure functions)
│   ├── content-blocks/    block schema and validation
│   ├── content-tools/     content:validate, import, drafting helpers
│   ├── design-tokens/     tokens as data: Unistyles themes, CSS variables
│   └── config/            tsconfig, eslint and prettier presets
├── content/               question drafts and daily sets, as files until the CMS owns them
└── docs/                  spec.md, roadmap.md, traceability.md, adr/, plans/, design/
```

Apps depend on packages; packages never depend on apps. Inside `apps/mobile/src`, the feature layout of spec §18.4 applies: thin route files, one folder per feature with a public `index.ts`, no deep imports across features.

### 4.3 Three flows that must be right

**Guest identity.** Most players never sign in, so the guest account is the account.
- At first launch the app creates a guest player. All game data is keyed to our own `player_id`, never to the auth library's user id.
- A device-held secret in SecureStore can mint a new session at any time, so an expired session never orphans a streak.
- Linking Apple, Google or email merges into the same `player_id` in one transaction.

**Fetching the daily.**
- The Global Daily body is identical for everyone on a date. It is built once and served from the CDN under a URL that includes the date and content version.
- The per-player session is get-or-create, unique on player, date and source, written with `INSERT … ON CONFLICT`. Two devices get the same session.
- The app prefetches today and tomorrow at a randomized time, so local midnight doesn't become a spike.

**Completing a session.**
1. The app writes the completion to its outbox before the first send, and retries with the same `Idempotency-Key`.
2. Before any transaction, the API validates the request, re-grades it with the shared engine against the session's immutable question snapshot, and runs the plausibility checks.
3. In one short transaction it locks the player row and inserts the completion with `ON CONFLICT DO NOTHING`. If the completion already exists, it returns the stored response. Otherwise it appends the XP and streak-day ledger rows, updates the progress snapshot and enqueues follow-up jobs.
4. Streaks derive from the set of credited local dates, so late, duplicate and out-of-order arrivals all converge on the same answer.
5. The worker batches question statistics and rating updates, because everyone answers the same daily questions.

---

## 5. Phases and gates

Week numbers assume the owner answers review requests within one working day. Owner review, device testing and content review set the calendar, not coding speed.

| Phase | Weeks | Outcome | Gate |
|---|---|---|---|
| 0. Foundations | 1–3, beside Phase 1 | Repository, pipelines, logic packages, API foundations, the review tool and the content pipeline exist | G0 |
| 1. Design | 1–3 | Brand, design system and every MVP screen in every state, on the design canvas | G1 |
| 2. The daily, end to end | 4–6 | One real loop on real devices, held to the budgets | G2 |
| 3. MVP breadth | 7–12 | Milestones M1–M5: every MVP requirement built | per milestone |
| 4. Hardening and beta | 13–15 | Checklists, load, security, store compliance, beta | G3 |
| 5. Soft launch | 16–21 | 4–6 weeks of measurement in 1–2 markets | G4 |

**G0. Foundations hold.**
- CI is a required check and is green.
- The native dependency smoke build passes on iOS, Android and web (FND-05).
- Staging deploys on merge, and the API foundations (BE-01 to BE-04) pass their checks there.
- `quiz-engine` and `game-rules` pass their property tests.
- 300 drafted questions are in the review tool (CMS-01), with the owner.

**G1. Design sign-off.**
- The screen index (`docs/design/screens.md`) maps every MVP requirement that has a user interface to an artboard on the canvas.
- Tokens pass contrast and colour-vision checks in light, dark and high contrast.
- Today, session and results exist at the largest text size.
- The daily-loop prototype has been tried by at least 5 people and the findings are folded in.
- The owner has approved the brand direction and the screens.

**G2. The daily is real.** Measured on a low-end Android reference device and a current iPhone:
- Fresh install to first question, then a completed Global Daily, without an account.
- A daily completed offline syncs later and raises the streak exactly once, including under a storm of duplicate retries.
- Cold start, tap feedback, next-question transition and frame rate meet spec §15.2.
- VoiceOver and TalkBack can complete the loop.
- 500 reviewed questions exist and 14 days of dailies are scheduled.
- The owner has played it for three consecutive days and accepts how it feels.

**G3. Ready to launch.**
- Every row of `docs/traceability.md` is done and verified.
- Every budget in spec §15.2 is met; the accessibility checklist (A11Y-14) passes.
- The end-to-end suite is green on `main`; the load test and the restore drill have passed.
- The store compliance pack is complete.
- ≥ 3,000 reviewed questions and ≥ 60 days of dailies are in place.
- Beta shows crash-free sessions ≥ 99.5%.

**G4. Gate to V1** is the spec's: D1 ≥ 35%, D7 ≥ 15%, crash-free ≥ 99.5%, Global Daily completion ≥ 85%.

---

## 6. Tickets

**Owners:** DES designer, FE frontend engineer, BE backend engineer, FS fullstack engineer, PM, OWN owner.
**Sizes:** S build straight away; M plan first; L plan first, in its own session and branch. `CLAUDE.md` defines the loop each ticket follows.
Tickets that touch the same files run one at a time. Everything else runs in parallel.

**Device passes.** The team drives simulators and emulators. Where a done-when line needs a real device, the engineer proves it on a simulator or emulator and hands over an internal build with a short checklist. The owner, or the device service chosen in O-6, runs the pass, and the PM marks the row verified afterwards.

### Phase 0. Foundations

BE-01 to BE-04 and CMS-01 run in this phase because they have no player-facing screen (§2, rule 1).

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| FND-01 | Monorepo scaffold: pnpm workspaces, TypeScript strict, ESLint 9, Prettier, commit lint, ADR template, one `verify` script | FS | S | approval | §18.3, §18.6 | `pnpm verify` passes; the layout matches §4.2 |
| FND-02 | CI as a required check from the first pull request; branch protection on `main` | FS | S | FND-01 | §21.2 | A failing test blocks a merge |
| FND-03 | ADRs for every row of §3.1 and §3.3 | PM | S | approval | §18.6 | Each ADR states the decision, the alternatives and the consequence |
| FND-04 | Accounts, environments and secrets: EAS, Fly.io, Neon, Cloudflare, Sentry, PostHog; `development`, `preview`, `production` | FS, OWN | M | O-2 | §21.2, SEC-01 | Secrets live only in platform stores; the README gets a new member running |
| FND-05 | Native dependency smoke build: an empty SDK 58 shell with every planned native library builds and launches on iOS, Android and web export; Android passes the 16 KB page-size check | FE | M | FND-01, FND-04 | §18.2 | Three green builds; versions recorded; any incompatibility has an ADR |
| FND-06 | Spec v1.1: fold §3.3 into the spec and renumber its ADR references | PM | S | FND-03 | — | No spec section contradicts this roadmap |
| FND-07 | Staging pipeline: API container with `/health`, a migration step, a database branch per pull request | BE | M | FND-04 | §21.2 | A merge reaches staging on its own; production is promoted by hand |
| ENG-01 | `content-blocks`: block schema and validation | FS | S | FND-01 | §11.3, QT-04, SEC-08 | Content that isn't structured blocks, or links that aren't https, fail validation |
| ENG-02 | `quiz-engine`: `{type, payload, key}` schemas, graders, answer normalization and scoring for the 5 MVP types | FS | L | ENG-01 | QT-01, QT-02, QT-03, §10.5, D13 | Graders are pure and property-tested against shared fixtures; a sixth type would touch no engine code |
| ENG-03 | `game-rules`: streak day boundary, time-zone credit, DST, freezes, milestones, XP, levels and daily goal as pure functions | BE | M | FND-01 | STK-01, STK-03, STK-04, STK-06, XP-01, XP-02, XP-03, XP-04 | Property tests cover DST changes and time-zone hops; arrival order can't change a streak |
| ENG-04 | `contracts` v0: schemas, endpoint registry, error codes and fixtures for config, identity, content, dailies, sessions and progress | FS | M | ENG-02 | §19.2, §19.3 | The registry generates OpenAPI 3.1 and every fixture parses with its schema |
| CT-01 | Taxonomy for the 11 launch domains, editorial guidelines, fact-check checklist | PM, OWN | M | approval | §11.4, §11.6 | The owner has approved all three |
| CT-02 | Content pipeline v0: file formats for questions, quizzes, collections and daily sets; `content:validate`; separate drafting and fact-check passes | FS | M | ENG-02, CT-01 | SAFE-07, A11Y-10, DLY-08, L10N-06 | The validator rejects a question with no source, no alt text or a duplicate answer |
| CT-03 | First 300 questions drafted and fact-checked, queued for human review | PM, OWN | L | CT-02 | §11.6 | 300 pass the validator and wait as files until CMS-01 imports them |
| BE-01 | API skeleton: structure, validation from `contracts`, RFC 9457 errors, request ids, Sentry, OpenAPI, route access levels (public, player, admin), per-player rate limiter; `GET /config` with ETag, server time, tunables, flags and `minAppVersion` | BE | M | FND-07, ENG-04 | §19.2, ADM-04 | On staging, `GET /config` parses with `contracts`, answers 304 to a matching ETag, and answers 429 with `Retry-After` over the limit |
| BE-02 | Schema v1 and migrations; separate application and migration roles; seed data; a test harness on real Postgres with a query-count helper | BE | L | BE-01 | §19.5, PRIV-08 | Migrations are expand-then-contract; personal data sits only in identity and device tables |
| BE-03 | Identity: guest player at first launch, sessions, the device-held secret, device registration; first Better Auth and Expo integration test | BE | M | BE-02 | ONB-02, SEC-02 | A guest whose session has expired gets a new one from the device secret and keeps the same `player_id` |
| BE-04 | Content store and publish pipeline: import, versioning, math to SVG, code tokens, image variants on R2 | BE | L | BE-02, CT-02 | §11.1–11.3, §15.2 | Publishing a version never changes a session already played; an image over 150 KB can't be published |
| CMS-01 | Review queue and question editor on React Admin's stock layout, with admin sign-in, roles and an audit log: see a draft's blocks, options, key, explanation and sources; approve, edit or reject | FS | L | BE-03, BE-04 | ADM-01, SAFE-07, A11Y-10, DLY-08 | A timed review of 20 questions averages under a minute each; nothing publishes without a named reviewer; every action is in the audit log |

### Phase 1. Design

The designer works on the design canvas, one artboard per screen and state, as a mobile designer would: one-thumb reach, two-minute sessions, largest text size first.

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| DS-01 | Brand direction: three directions, each with name candidates, personality, mascot concept, palette and type | DES | M | approval | Q1, §12 | The owner has picked one; the name passes a first trademark and store search (O-3) |
| DS-02 | Experience map: first launch, the daily loop, session states, results, challenge send and accept, save-progress prompts, notification primer, account deletion; empty, error, offline and slow states | DES | M | DS-01 | §6, §8, §10.2, ONB-01 | Every flow reaches its end; the first question is on screen within 30 s of first launch |
| DS-03 | Design system: tokens, light, dark and high-contrast themes, and the MVP components of §12.9 in every state | DES | L | DS-01 | §12, A11Y-05, A11Y-06, A11Y-07, A11Y-12 | Contrast and colour-vision checks pass in all three themes |
| DS-04 | Core loop screens: Today with its four daily-card states; the session for each of the 5 question types in every machine state; pause, exit, results sequence, review, share card | DES | L | DS-02, DS-03 | §9.1–9.3, §10, DLY-04, DLY-05, RES-01 | Each state of spec §10.2 has an artboard |
| DS-05 | Onboarding and account screens | DES | M | DS-03 | ONB-01 to ONB-09 | Each step of ONB-01 has an artboard; the under-13 and declined-notification paths have one each |
| DS-06 | Explore, search, filters and quiz detail | DES | M | DS-03 | EXP-01 to EXP-05, PLAY-01 | Loading, empty, no-results and offline states each have an artboard |
| DS-07 | Compete and challenges, profile and badges, settings, report, block, forced update | DES | M | DS-03 | §6.6, PRF-01, §7.11, SAFE-01, SOC-03 | Every settings group of spec §7.11 and every challenge state has an artboard |
| DS-08 | Web share page, landing and legal pages; admin console wireframes | DES | S | DS-03 | WEB-01, WEB-03, ADM-01, ADM-02, ADM-03 | The share page shows its link preview; each admin task in CMS-02 has a wireframe |
| DS-09 | Accessibility pass on every core screen: largest text size, Reduce Motion, screen-reader order and labels; the screen index (`docs/design/screens.md`) mapping every artboard to the requirement IDs it covers | DES | M | DS-04 to DS-07 | §13 | No clipping at 200% text; every control has a label and a state; the index has no MVP requirement without an artboard |
| DS-10 | Clickable prototype of the daily loop, tried by at least 5 people across the personas | DES, OWN | M | DS-04 | §22 (P0) | Findings are written up and folded into the screens |
| DS-12 | Production assets: app icon and splash, 11 domain illustrations, core badge art, static mascot states, avatar parts, the sound set; font and sound licences confirmed for embedding in an app | DES, OWN | L | DS-03 | §12.3, §12.7, §12.8, BDG-01, PRF-05 | Every asset the MVP screens show exists at export size, with its licence recorded |
| DS-11 | Handoff: tokens exported to `packages/design-tokens`; component, motion and copy specs and assets in `docs/design/` | DES | M | G1, DS-12 | §12 | An engineer can build any screen without asking what it looks like |

### Phase 2. The daily, end to end

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| BE-05 | Dailies: one Global Daily per date; cached body; get-or-create session per player and date, accepting tomorrow; contract shapes finalised against the approved flows | BE | M | G1, BE-03, BE-04 | DLY-01, DLY-02, DLY-07, DLY-08, OFF-01 | 50 parallel creates return one session |
| BE-06 | Completion write path (§4.3): idempotent complete, re-grade, plausibility v0, XP and streak ledgers, percentile, `GET /me/progress` | BE | L | BE-05, ENG-03 | STK-01, STK-02, STK-03, XP-01, XP-04, DLY-06, OFF-03, OFF-04, SEC-03, SEC-05 | Parallel duplicates create one ledger entry; a completion that arrives two days late credits the right day |
| FE-01 | App shell: Router with NativeTabs, providers, themes from tokens, fonts, i18n with a pseudo-locale, error boundaries, environment config, feature-flag client with kill switches, Sentry, development menu | FE | M | FND-05, DS-11 | §8.1, §18.6, L10N-01, L10N-02, L10N-03, L10N-09 | Web export builds in CI; lint rejects literal strings and raw style values; a flag turned off remotely hides its feature |
| FE-02 | Core components and the gallery route: Button, AnswerButton, QuestionView, TimerRing and TimerBar, ProgressSegments, DailyCard, StreakFlame, ExplanationPanel, ResultSummary, Skeleton, EmptyState, ErrorState, Toast, OfflineBanner | FE | L | FE-01, DS-11 | §12.9, A11Y-01, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, PLAY-06 | Each component renders in every state × theme × largest text size in the gallery |
| FE-03 | Session engine: the state machine of §10.2, timing on the UI thread, answer rhythm, haptics and sound, snapshot and resume | FE | L | ENG-02, FE-02 | PLAY-03, PLAY-07, §10, A11Y-02, A11Y-04, A11Y-08, A11Y-13 | No React render per timer tick; a killed app resumes paused |
| FE-04 | Renderers for the 5 question types, with keyboard, screen-reader and non-drag alternatives | FE | L | FE-03 | QT-01, QT-04, QT-05, A11Y-09, A11Y-11, SEC-08 | Every type can be completed by keyboard alone and by screen reader alone |
| FE-05 | Data layer: validating client with timeout, backoff and 429 handling; guest creation at first launch; query cache persisted to MMKV; fake server with the scenario switcher; offline indicator | FS | L | ENG-04, FE-01 | ONB-02, OFF-06, OFF-07, SEC-02, SEC-06, §19.6 | The client suite passes against the fake server and against the real API, with the same schemas |
| FE-07 | Outbox and prefetch: completions written before the first send and retried under one idempotency key; sync on launch, reconnect and foreground; jittered prefetch of today and tomorrow; optimistic streak; capped offline XP | FS | L | FE-05 | OFF-01, OFF-03, OFF-04, DLY-07, STK-02, XP-04 | A daily played in airplane mode syncs exactly once on reconnect, in an emulator test that kills the app mid-send |
| FE-06 | Today and the Global Daily loop: the four card states, results with score, grid, streak and percentile, pending-sync indicator | FE | M | FE-03, FE-04, FE-07, BE-06 | DLY-02, DLY-03, DLY-04, DLY-06, RES-05, §9.1 | The loop completes on simulator and emulator against staging; the build and checklist for the G2 device pass are with the owner |
| QA-01 | Harness: Maestro smoke test of the daily loop on EAS Workflows; a script that records startup, frame and memory figures; the device-pass checklist | FS, OWN | M | FE-06 | §15, §21.1 | Budgets are recorded per build; the owner's device pass fills in the reference-device figures |
| CT-04 | 500 reviewed questions; 14 days of Global Daily sets scheduled | PM, OWN | L | CMS-01 | §11.6, DLY-01 | G2's content check passes |

### Phase 3. MVP breadth

Each milestone ends with a build to internal testers and a PM check against `docs/traceability.md`.

**M1. Onboarding and accounts**

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| BE-10 | Onboarding server side: the age gate, interests stored on the player, and a first-quiz session of 5 easy questions from those interests | BE | M | BE-06 | ONB-01, ONB-06, PRIV-01 | A birth year under 13 is refused and nothing about that player is stored |
| BE-16 | Sign-in and linking: Apple, Google and magic link, with the email service; linking merges into the same player; restore on a new device | BE | L | BE-03 | ONB-04, ONB-05, ONB-08, PRIV-06 | A linked guest keeps streak and XP; signing in on a second device shows the same progress |
| BE-17 | Usernames and deletion: availability check, filter and moderation; the account deletion job | BE | M | BE-16 | ONB-07, ONB-09, PRIV-02, PRIV-07, SAFE-03 | A blocked word is refused before anyone can see it; a test proves deletion removes every row of personal data |
| FE-10 | Onboarding: welcome, age, interests, first quiz, celebration, notification primer, optional account | FE | M | FE-06, BE-10 | ONB-01, ONB-02, ONB-06, PRIV-01 | First question within 30 s of first launch on the emulator; the low-end figure comes from the device pass |
| FE-11 | Accounts: the save-progress prompt (first shown on the second streak day), sign-in, username and basic avatar builder, restore, delete account | FE | M | BE-16, BE-17, FE-10 | ONB-03, ONB-04, ONB-05, ONB-07, ONB-08, ONB-09, PRF-05, PRIV-02, PRIV-06 | A guest with a 2-day streak signs in with each provider and keeps it; delete account ends on the welcome screen with local data cleared |

**M2. Progress and retention**

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| BE-11 | Progress: levels, daily goal, earned freezes, milestones; the badge award engine with streak, perfect-score and topic-mastery badges | BE | L | BE-06 | XP-02, XP-03, STK-04, STK-06, BDG-01 | A missed day with a freeze held keeps the streak; a milestone awards its badge exactly once |
| BE-18 | Daily 5: player and question ratings; selection of 5 from the player's interests at the ~70% target; sessions that accept tomorrow for prefetch | BE | L | BE-10, BE-11 | D5-01, D5-02, OFF-01, §11.5 | Simulated players of different skill each get sets predicted near 70%; no question repeats within 30 days |
| BE-12 | Notification preferences and the push sender job (batches, receipts, retries) | BE | M | BE-03 | NTF-02, NTF-04 | A revoked token stops receiving within a day |
| FE-12 | Progress UI: XP bar, level, goal ring, streak states, badges, celebrations, the full results sequence, the Daily 5 card with prefetch; the save-progress prompt on a first badge | FE | L | BE-11, BE-18 | XP-02, XP-03, STK-06, BDG-01, RES-01, D5-01, D5-02, OFF-01, ONB-03 | Reduce Motion replaces every celebration with a fade; Daily 5 plays in airplane mode |
| FE-13 | Notifications: primer after the first completed quiz, channels, local streak reminder, quiet hours, actions that deep-link into a session | FE | M | BE-12 | NTF-01, NTF-02, NTF-03, NTF-04, NTF-05 | The reminder is cancelled once the player has played |

**M3. Explore and play**

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| BE-13 | Catalogue: domains, topics, quizzes and collections with cursor pagination and ETags; quiz sessions in Standard, Relaxed and Practice; region tags | BE | L | BE-04 | EXP-02, EXP-05, PLAY-02, L10N-06 | Each list endpoint stays inside its query budget; a cursor stays stable while content is published |
| BE-19 | Search and ranking: typo-tolerant search over quizzes and topics; rule-based ranking with ~20% exploration | BE | M | BE-13 | EXP-03, EXP-06 | A one-letter typo still finds the quiz; about one result in five lies outside the player's interests |
| BE-14 | Safety: reports with acknowledgement; automatic suspension of a question on a high report rate | BE | M | BE-06 | PLAY-05, SAFE-01, SAFE-05, SAFE-07, PRIV-07 | A suspended question is never served again until reviewed |
| FE-14 | Explore: header search, interest chips, category grid, collections, domain to topic to quiz lists, filter sheet | FE | L | BE-13, BE-19 | EXP-01, EXP-02, EXP-03, EXP-04, EXP-05 | Lists hold 60 fps on the emulator; the low-end figure comes from the device pass |
| FE-15 | Quiz detail; Standard, Relaxed and Practice modes; leave and resume; Continue on Today | FE | M | BE-13 | PLAY-01, PLAY-02, PLAY-07, DLY-03 | A Relaxed quiz shows no timer and gives full XP; a quiz left midway appears under Continue on Today |
| FE-16 | Results actions, the review screen and the report sheet | FE | M | BE-14 | RES-02, RES-03, PLAY-05, SAFE-01, SAFE-05 | A report is acknowledged in the app; the review shows each question with the player's answer, the correct answer, the explanation and its sources |

**M4. Challenges, sharing and web**

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| BE-15 | Challenges: create, fetch by code, accept, identical question snapshot, comparison, 72-hour expiry enforced on read, "your turn" push, challenge badges; blocks | BE | L | BE-06, BE-12 | CHL-01, CHL-03, CHL-05, BDG-01, SOC-03, SAFE-02, PRIV-07 | A blocked player can't challenge, view or appear; an expired challenge can't be accepted |
| FE-17 | Challenges: send, the "Your turn" inbox on Today and Compete, comparison, rematch and challenge back; block and the blocked list; the save-progress prompt on a first challenge | FE | L | BE-15 | CHL-01, CHL-03, CHL-05, SOC-03, SAFE-02, ONB-03 | Two emulators complete a challenge and a rematch; each card state (your turn, waiting, won, lost, expired) can be reached |
| FE-18 | Share card: image and text versions, spoiler-free | FE | M | FE-06 | DLY-05 | Neither version contains an answer; both go through the system share sheet |
| WB-01 | Universal links, share pages with Open Graph images, deep-link validation | FS | L | BE-15 | CHL-02, WEB-01, SEC-07, NTF-05 | A link opens the app when installed and the web page otherwise; a link never acts without a tap |
| WB-02 | Landing page, legal pages and the published support contact | FS | S | DS-08 | WEB-03, PRIV-09, SAFE-04 | Every legal link in the app resolves; the support contact matches the store listing |

**M5. Profile, settings, compliance and operations**

| ID | Ticket | Owner | Size | Depends on | Spec | Done when |
|---|---|---|---|---|---|---|
| FE-19 | Profile: identity, stats, badge shelf | FE | S | BE-11 | PRF-01 | Stats match `GET /me/progress` for each scenario player in the fake server |
| FE-20 | Settings: every MVP group of spec §7.11 | FE | L | BE-17, BE-12 | §7.11, A11Y-08, A11Y-12, L10N-03, PRIV-04, PRIV-09, SAFE-04 | Each setting survives a restart and takes effect without one; the timer setting never changes a score (D13) |
| FE-21 | Analytics events with consent, EAS Observe, the forced-update screen | FE | M | FE-01 | §20, §21.2, PRIV-04 | No event carries personal data; with consent off nothing is sent; the update screen never interrupts a quiz |
| CMS-02 | Admin v1: quiz and collection assembly, daily-set scheduler with a 14-day preview, moderation queue, remote config and flags, player preview through the app's web build | FS | L | CMS-01, BE-14, FE-04 | ADM-02, ADM-03, ADM-04, SAFE-05 | A scheduled set appears in the app on its date; a report can be resolved from the queue |
| QA-02 | Release pipeline: EAS Update channels, fingerprint runtime versions, a rollback that has been rehearsed, phased release | FS | M | FE-21 | §21.2 | A bad update is rolled back in a drill |
| QA-03 | Store compliance pack: privacy manifest, App Store privacy labels, Play Data safety form, age rating, review notes | PM, FS | M | FE-20 | PRIV-05, PRIV-07, SAFE-04 | Someone who has never seen the app can complete both store forms from the pack |
| CT-05 | 1,500 reviewed questions; at least 100 quizzes across the 11 domains and the three launch collections (quiz counts are PM targets) | PM, OWN | L | CT-04 | §11.6, EXP-01 | Reached by the end of M3; quiz covers use the category colour and illustration |
| CT-06 | 3,000 reviewed questions across 11 domains; at least 250 quizzes; 60 days of dailies scheduled | PM, OWN | L | CT-05, CMS-02 | §11.6, L10N-11 | G3's content check passes |

### Phase 4. Hardening and beta

| ID | Ticket | Owner | Size | Spec | Done when |
|---|---|---|---|---|---|
| QA-04 | Accessibility release checklist: VoiceOver, TalkBack, largest text, Reduce Motion, keyboard | FE, PM, OWN | M | A11Y-14, §13 | Every flow passes on both platforms in the owner's device pass |
| QA-05 | Pseudo-localization pass | FE | S | L10N-02 | No clipped or hard-coded text |
| QA-06 | Performance pass on the reference devices | FE, OWN | M | §15.2 | Every budget met, with numbers recorded from the device pass |
| QA-07 | End-to-end suite: onboarding to first quiz, Global Daily, challenge link, resume, offline to sync, account deletion | FS | M | §21.1 | Green on `main` |
| QA-08 | Security and privacy review: authorisation on every route, rate limits, deep links, secrets, data minimisation | BE, PM | M | SEC-01, SEC-03, SEC-07, PRIV-08 | No open high or medium finding |
| QA-09 | Load and recovery: 100 completions/s and 500 reads/s for 30 minutes; duplicate storm; restore drill | BE | M | §15.4 (the figures are PM targets) | p95 under 300 ms, zero duplicate ledger rows, a restore that works |
| QA-10 | Beta on TestFlight and Play closed testing; fix list | FS, OWN | M | §21.1 | Crash-free sessions ≥ 99.5% |

### Phase 5. Soft launch

| ID | Ticket | Owner | Done when |
|---|---|---|---|
| REL-01 | Phased release in the chosen markets (O-5), English only (L10N-11) | FS, OWN | Live at 100% with no rollback |
| REL-02 | Weekly reading of the spec §3 metrics; decision at G4 | PM, OWN | V1 starts, or the loop is reworked |

---

## 7. Engineering guardrails

These are the definition of done. A ticket that breaks one isn't finished. The reviewer checks the ones that apply.

**Architecture and reuse**
- An endpoint exists in `packages/contracts` before the API or the app implements it.
- Grading, scoring, streak and XP logic live in shared packages and nowhere else. The server's result is authoritative; the app's is optimistic.
- A component is built once, in the design system, and shown in the gallery. Screens compose components.
- Colours, spacing, radii and font sizes come from tokens; user-facing text comes from i18n. Lint enforces both.
- A significant decision gets an ADR in the same pull request.
- Every new feature sits behind a flag, and every risky surface has a kill switch.

**Data, queries and concurrency**
- Each endpoint has a query-count budget asserted in a test, so an N+1 fails CI.
- A new query on a table expected to pass 100,000 rows ships with its index and an `EXPLAIN (ANALYZE, BUFFERS)` on seeded data.
- Lists use cursor pagination. `OFFSET` isn't used.
- One transaction per command: lock the player row first, keep it short, make no network call inside it.
- Get-or-create is `INSERT … ON CONFLICT`, backed by a unique constraint.
- Every replayable endpoint stores and replays its response by `Idempotency-Key`; the same key with a different body is rejected.
- XP, streak and (later) wallet changes are append-only ledger rows with unique natural keys.
- Each write path has a test that fires parallel duplicates and asserts one effect.
- Migrations are expand, migrate, contract, with indexes built concurrently.

**Caching**
- Versioned content is served under immutable URLs with an ETag equal to its version. It changes by publishing a new version, never by purging.
- Per-player responses are `private`. Nothing personal is cached at the CDN.
- `/config` is revalidated with its ETag; a running session keeps the values it started with.

**Performance and scale**
- The budgets in spec §15.2 block a release. They are measured on the low-end Android reference device.
- Animation runs on the UI thread. The timer causes no React render per tick.
- Startup does only what the first frame needs; analytics, prefetch and heavy scenes come after.
- Question images are at most 150 KB at device width.
- The app adds jitter to prefetches and to refetches after a push burst.

**Security and privacy**
- Every route declares itself public, player or admin. Object access filters by `player_id` inside the query, and a test proves another player's id is refused.
- The application's database role can't alter the schema. Secrets live only in platform secret stores, never in the app bundle.
- Rate limits apply per IP at the edge and per player in the API; every 429 carries `Retry-After`. Guest creation is limited hardest.
- Personal data is confined to identity and device tables, is never written to logs or analytics, and is covered by a tested deletion job. Export follows in V1.
- Content renders from structured blocks only. Links are https and open in the in-app browser.
- Users never exchange free text (SOC-04). Usernames are filtered before anyone else sees them.
- Purchases never affect ranked outcomes (MON-04).
- Admin actions are written to an audit log.

**Availability and recovery**
- The API runs on at least two machines behind health checks and deploys without downtime.
- The daily loop keeps working when the API is down: dailies are prefetched and results wait in the outbox.
- Production has point-in-time recovery and a weekly dump to R2. A restore is rehearsed before launch.
- Target for soft launch: 99.9% monthly API availability.

**Quality**
- Logic is written test-first. `pnpm verify` is green before a report.
- User-interface work is run on an iOS simulator and an Android emulator, in light and dark, at the largest text size, before a report.
- Interactive components expose role, label and state, and a test asserts them.
- A pull request covers one ticket and cites its requirement IDs.

---

## 8. Owner decisions and actions

| # | Needed | By |
|---|---|---|
| O-1 | Approve this roadmap: scope, order and stack | Before any ticket starts |
| O-2 | Open or share accounts: Apple Developer, Google Play Console, GitHub, Expo, Fly.io, Neon, Cloudflare and a domain, Sentry, PostHog, OpenAI and an email-sending service. Authorize the GitHub and Expo connectors for the team. | FND-04, week 1 |
| O-3 | Pick the brand direction and name; arrange a trademark check; approve any paid font, sound or illustration licence | DS-01, week 1; the check before any store upload |
| O-4 | Name the human reviewer or reviewers for content and the hours per week; decide the content source and licensing (spec Q8) | CT-01, week 1 |
| O-5 | Choose the soft-launch markets (spec Q2). This also fixes the hosting region. | FND-04 |
| O-6 | Provide the reference devices (spec §15.1) or approve a device-testing service. The team can only drive simulators and emulators. | FE-06, about week 6 |
| O-7 | Legal: privacy policy, terms, community guidelines; counsel's view on age-assurance rules for a 13+ app (A11) | M5 |
| O-8 | Review turnaround: design reviews, content review and device passes within a working day keep the calendar in §5 | Throughout |

Fixed running cost at soft launch, from list prices on 2026-11-14, is roughly $70 a month (Fly.io about $20, Neon about $19, Sentry $29), plus the domain, the EAS plan and store fees, which aren't priced here.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Content review is slower than the build.** 3,000 questions need a human each. | Content starts in week 1; the review tool is built in Phase 2; targets are staged (300, 500, 1,500, 3,000). If review lags, launch scope shrinks before quality does. |
| **A library isn't ready for React Native 0.88.** Several have no explicit statement yet. | FND-05 builds every planned native library in week 1, before anything depends on them. |
| **The daily loop works but doesn't feel premium.** | G2 puts the loop on a low-end device in week 6, and the owner signs off on feel before breadth starts. |
| **Guest progress is lost** on session expiry or account linking. | §4.3; BE-03 and BE-10 each carry a test for it. |
| **Duplicate or late completions corrupt streaks.** | Idempotency, ledgers and date-set streaks (§4.3); the duplicate-storm test gates G2 and G3. |
| **Store and platform deadlines.** Google Play requires 16 KB page support for updates from 2027-02-01; Apple's new age-rating answers are due 2027-01-12; a new personal Play account may need a closed test before production access (verify when the account is opened). | FND-05 checks 16 KB; QA-03 covers the forms; beta starts in week 13, not at the end. |
| **Age-assurance law changes** for apps with usernames. | O-7; `expo-age-range` is available if counsel says it is needed. |
| **Vendor change or outage.** | A container and plain Postgres: the host and the database provider are replaceable. |
| **Dependencies move.** Hono 5, Drizzle 1.0 and XState 6 are all close. | Pin versions; one upgrade window per phase; adapters around auth, persistence and moderation. |
| **Scope creep into V1.** | `docs/traceability.md` lists MVP requirements only. Anything else needs a roadmap change approved by the owner. |

**Lessons carried over from the earlier prototype of this spec**, as cautions only (none of its code is used): no visual design pass was ever scheduled; content reached 1% of the target; CI existed but never ran on a pull request; the component workbench never rendered on a device; an update runbook was written for a feature that wasn't installed. G0 to G3 check behaviour on devices and in pipelines, not documents.

---

## 10. After soft launch

V1, V2 and V3 keep the scope of spec §22. V1 is planned in detail only after G4, with real retention data. Three things are already known:

- **Leagues** stay in Postgres (A6).
- **RevenueCat** stays on its 10.x line until 11 supports Expo.
- **Passkeys** need a spike: the auth library documents browser WebAuthn only.
