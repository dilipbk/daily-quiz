# Architecture decision records

An ADR records one significant decision: what was decided, what else was considered and what follows from it. Write one when you choose a library, change a package boundary or depart from the spec, and commit it in the same pull request as the change (`CLAUDE.md`, roadmap §7).

## Writing one

1. Take a number your ticket holds in the register below. If the ticket holds none, ask the PM for one before you write: twice, two parallel branches picked the same "next free" number.
2. Copy `0000-template.md` to `NNNN-short-title.md`.
3. Fill in every section. Keep it to one page: a reader should learn the decision from the first two sections.
4. Set the status to `Proposed`. The PM moves it to `Accepted` at review.

## Changing one

An accepted ADR isn't edited to say something new. Write a new ADR that supersedes it, then set the old one's status to `Superseded by NNNN`.

## Statuses

| Status | Meaning |
|---|---|
| `Proposed` | Written, waiting for the PM's review |
| `Accepted` | In force |
| `Superseded by NNNN` | Replaced by a later ADR; kept for its reasoning |
| `Rejected` | Considered and turned down; kept so the question isn't reopened without new facts |

## Reserved numbers

The PM reserves numbers per ticket. A number can be in use on a branch that hasn't merged yet, so this table says what is free, and the folder listing doesn't.

| Numbers | Ticket |
|---|---|
| 0001–0002 | FND-01 |
| 0003–0005 | ENG-03 |
| 0006, 0007, 0009–0019 | FND-05 and FND-05b (0006 to 0012 are in use) |
| 0008 | ENG-01 |
| 0020–0021 | ENG-02 |
| 0022–0024 | ENG-04 |
| 0025–0029 | not assigned |
| 0030–0078 | FND-03 |
| 0079 onward | not assigned |

## Stack and spec-amendment decisions (FND-03)

ADRs 0030 to 0078 record the decisions of roadmap §3.1 and §3.3, one ADR per decision. The owner approved those decisions with roadmap v1.1 on 2026-11-14, so that is their date and they are `Accepted`; they were written down on 2026-11-21. Where an amendment in §3.3 and a row of §3.1 are the same decision, one ADR covers both.

Versions and compatibility facts in them come from the roadmap (checked 2026-11-14) and from the FND-05 smoke build (2026-11-15, ADR 0006). Check the official docs again on the day you install or upgrade.

| Roadmap row | ADR | Decision |
|---|---|---|
| Mobile: Framework; A1 | 0030 | Expo SDK 58 from the start, in development builds, with strict TypeScript |
| Mobile: Navigation | 0031 | Expo Router with NativeTabs, the native stack and form sheets |
| Mobile: Native UI | 0032 | @expo/ui, expo-symbols and expo-glass-effect for native chrome |
| Mobile: Styling and themes | 0033 | Unistyles 3 on Nitro Modules for styles and themes |
| Mobile: Animation and gestures | 0034 | Reanimated 4 with Worklets, and Gesture Handler at Expo's pin |
| Mobile: Graphics; A8 | 0035 | Skia for confetti and share cards only; the timer ring is SVG |
| Mobile: Lists | 0036 | FlashList 2 for long lists, with Legend List as the fallback |
| Mobile: Session state | 0037 | XState 5 for the session machine, behind our own versioned persistence adapter |
| Mobile: Server state | 0038 | TanStack Query 5 for server state, persisted to MMKV |
| Mobile: App and UI state | 0039 | Zustand 5 for app and interface state |
| Mobile: Storage | 0040 | MMKV for local data, SecureStore for secrets, SQLite deferred to V1 |
| Mobile: API client; A7 | 0041 | A thin API client, driven by the contracts registry, that validates every response |
| Mobile: Mocks; A4 | 0042 | An in-process fake server at the client's transport, not MSW |
| Mobile: Component workbench; A5 | 0043 | An in-app gallery route, not Storybook |
| Mobile: i18n | 0044 | expo-localization and i18next with ICU messages |
| Mobile: Auth (device) | 0045 | Better Auth's Expo client, with native Apple and Google sign-in |
| Mobile: Notifications | 0046 | expo-notifications with the Expo push service |
| Mobile: Analytics and flags | 0047 | PostHog for analytics, feature flags and experiments |
| Mobile: Crashes and performance | 0048 | Sentry for crashes, EAS Observe for startup and navigation timing |
| Mobile: Updates | 0049 | expo-updates and EAS Update, with fingerprint runtime versions |
| Mobile: Tests | 0050 | Jest and Testing Library for the app, Maestro for end-to-end tests |
| API: Framework and runtime | 0051 | Hono 4 on Node 26, in one image that runs an API process and a worker process |
| API: Hosting | 0052 | Fly.io, on at least two machines |
| API: Database | 0053 | Postgres on Neon |
| API: Data access | 0054 | Drizzle, using its SQL-style builder only |
| API: Jobs and schedules | 0055 | pg-boss for jobs and schedules, in the same database |
| API: Cache and rate limits; A6 | 0056 | Postgres and the CDN for caching and rate limits; no Redis at MVP |
| API: Auth | 0057 | Better Auth, pinned exactly, with all game data keyed to our own player_id |
| API: Email | 0058 | The transactional email service is chosen in BE-16 |
| API: Media | 0059 | Cloudflare R2 for media, with image variants generated at publish |
| API: Edge | 0060 | Cloudflare in front: CDN, WAF and per-IP rate limits |
| API: Search | 0061 | Postgres full-text search with pg_trgm and unaccent |
| API: Moderation | 0062 | Generated usernames, a blocklist and OpenAI moderation behind our own interface |
| API: Publish-time rendering | 0063 | Math, code and images are rendered when content is published |
| API: Errors | 0064 | RFC 9457 problem details with stable codes, from one error handler |
| API: Tests | 0065 | API tests run on Vitest against real Postgres |
| API: Observability | 0066 | Sentry, structured logs with a request id, and uptime and cron monitors |
| Web: share, landing and legal pages | 0067 | Web pages are Expo Router routes with server output, on EAS Hosting |
| Admin console | 0068 | The admin console is a React Admin single-page app on the same API |
| Monorepo | 0069 | One pnpm 11 workspace |
| Lint and format | 0070 | ESLint 9 and Prettier |
| CI/CD | 0071 | GitHub Actions for checks and API deploys; EAS for app builds, submissions and updates |
| A2 | 0072 | The API is built now, in this monorepo |
| A3 | 0073 | Revocable server-side sessions and a device-held secret, not access and refresh tokens |
| A9 | 0074 | The roadmap's phases replace the spec's solo timeline |
| A10 | 0075 | This repository starts its own ADR series |
| A11 | 0076 | The birth-year age screen stays; age assurance is a question for counsel |
| A12 | 0077 | The brand name and mascot are decided in DS-01, with a trademark check before any store upload |
| A13 | 0078 | Five prototype sessions before G1, not ten to fifteen interviews |
