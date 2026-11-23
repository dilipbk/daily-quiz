# FND-06 Spec v1.1: plan

**Ticket:** FND-06 · **Status:** PLAN FOR APPROVAL, 2026-11-23 · **Owner:** PM, delegated · **Size:** M, confirmed: one file, but 13 amendments, 61 ADRs to hold it against, 24 stale citations, and requirement IDs that tests, commits and `docs/traceability.md` cite · **Branch:** `docs/FND-06-spec-v1-1`

**Goal:** `docs/spec.md` version 1.1. No section contradicts `docs/roadmap.md` or an accepted ADR, no citation points at the earlier codebase's ADR series, and every requirement ID of 1.0 is still there.

**Scope:** `docs/spec.md`, and `docs/traceability.md` only where a row's "MVP scope" wording no longer matches the spec. No ADR, no roadmap change, nothing in `docs/content/` or `docs/design/`.

Line numbers below are those of spec 1.0 at `origin/main` `95b6fd9`.

---

## What I found before planning

1. **ADRs 0001 to 0024 are all `Proposed`; 0030 to 0078 are `Accepted`.** Five of the nine ADRs that hand work to this ticket are therefore not binding by the brief's rule: 0002, 0003, 0004, 0008 and 0024. The roadmap's FND-06 row names 0003, 0004 and 0008, and the brief names 0002 and 0024's S1 and S5, so I fold exactly those. Everything else a `Proposed` ADR says differently from the spec is listed under "Proposed ADRs and the spec" for a ruling, and not folded.
2. **The `alt` question already has an answer in this series.** ADR 0022 decision 4: a published media asset "carries no alt text or transcript. The block does", and its consequences say "the block's is the one a device reads". ENG-04 is merged with that shape. So the spec can say "the block's" without a new decision (question P2 below asks only what §11.1 should say about the asset's own fields).
3. **The brand name isn't on `main`.** `docs/design/` doesn't exist there yet and no ADR records the name DS-01 chose. The spec can say who decides and when (ADR 0077); it can't cite the name (question P4).
4. **`docs/` is in `.prettierignore`,** so `pnpm verify` doesn't read the spec. The brief's "the format check reads Markdown" doesn't hold for this file. Table damage therefore gets its own check (see "Proof").
5. **Nothing links to a spec heading anchor** (`grep -rn 'spec\.md#'` finds nothing), so retitling §19 breaks no link. Section numbers don't change.
6. **§10.5 doesn't mention typed answers,** so it has nothing to contradict the owner's ruling with; only QT-03 does. §10.5 gets no change for item 7.
7. **The roadmap itself records the typed-answer ruling** (CT-02's row: "the file format defaults a typed answer's `maxTypos` to 0"), so QT-03's change rests on the roadmap as well as on EG-33.
8. **Two references to the earlier codebase's tickets remain,** beside its ADRs: "MVP-08" in D13 (line 69) and "with the challenges ticket" in §19.6 (line 1231). The second goes with its citation. The first stays: done-when (c)'s pattern counts `MVP-08` as an ID that must survive, and D13's attribution to the owner is still true. I list it in the report for the PM.
9. **A read-only subagent swept all 61 ADR files and the roadmap against the spec** before this plan was finished, so the map below is not only my own reading. I checked each of its findings against the spec line and the source; the ones that hold are in the map, and the ones about `Proposed` ADRs are in the last table. It also read ADRs 0006, 0007 and 0009 to 0012 on the unmerged FND-05 branch: all `Proposed`, none in conflict with the spec.

## Questions for the PM

Each has a default. If the answer to all is "as recommended", say so and I build.

| # | Question | Recommended default |
|---|---|---|
| P1 | May spec 1.1 cite ADRs 0003, 0004, 0008, 0022 and 0024 while they are `Proposed`? | Yes: the roadmap row and the brief direct the fold, and the tickets are merged. I list them in the report as needing their status moved. |
| P2 | §11.1 gives MediaAsset an `alt` "required for images" and a `transcript` "required for audio". With the block's being the one rendered, what are the asset's? | Keep the fields. Add one sentence: they describe the asset in the media library and are the text an editor starts from; they aren't sent to a device. Whether they stay "required" is BE-04's to settle, and I say so in the report. |
| P3 | QT-03's new wording (below, row "Typed answers"). | As drafted. ADR 0021's R6 still says "on by default"; the spec follows the owner and cites EG-33. Superseding R6 is the PM's. |
| P4 | Print the brand name in the header? | No: "Decided in DS-01 with the owner (ADR 0077); a trademark check comes before any store upload." The name goes in when `docs/design/` is on `main`. |
| P5 | Where ADR 0004's table lives. | Small wording changes inside STK-01, STK-04, XP-01 to XP-04 and PLAY-02, plus two unnumbered blocks, "Streak rules" after §6.3's table and "XP rules" after §6.4's. No new requirement ID. |
| P6 | A short "Appendix D: Changes in version 1.1" in the spec (one row per amendment and ADR, with the sections touched, no line numbers). | Add it: the owner approves the spec and shouldn't need the diff to see what moved. The line-level table stays in the pull request body. |
| P7 | Retitle §19 "Backend contract (assumptions)" to "Backend contract", §19.1 "Assumed stack" to "Stack", §19.6 "Mocking during app development" to "The fake server". | Yes. Numbers stay; the Contents entry follows. |
| P8 | §25 marks Q1, Q3 and Q7 as answered (ADRs 0077, 0030, 0057) and gains Q10, age assurance (roadmap O-7), which is how A11's open question gets a name. A `Q` number isn't a requirement ID. | Yes, with a "State" column. |
| P9 | The `Proposed`-ADR differences listed at the end: fold any of them now? | No. List them in the report. R3 (the combo) and S13 (`/config`) are the two worth a ruling before the owner reads 1.1. |

---

## Map: amendment or ADR to spec sections

"Status" is the ADR's. A line number in **bold** is a second or third place that says the old thing: the risk the brief names.

### Roadmap §3.3

| Source | Status | Spec 1.0 lines | Change |
|---|---|---|---|
| Header (brief item 1) | n/a | 5–10 | Version 1.1; date 2026-11-23; status "amended to roadmap v1.1 and the accepted ADRs, for the owner's approval"; scope names the app, the web pages, the API and the admin console in one monorepo; working title per P4. |
| A1, ADR 0030 | Accepted | D4 60; §18.1 1033–1039; **§18.2 1045**; **§22 1308**; Q3 1407; Appendix C 1452 | Start on SDK 58 (stable since 2026-10-15; React Native 0.88, React 19.3). §18.1 is re-dated 2026-11-14 and keeps only facts the roadmap or ADR 0030 state; `expo-router/native-tabs`; the Android-widget line says what was true on 2026-09-27 and that NTF-08's ticket re-checks it. Q3 answered: iOS 16.4, Android `minSdk` 24. NTF-08 (395) already says "SDK 58+": no change. |
| A2, ADR 0072 | Accepted | Scope 8; D5 61; D3 59; §7.14 453; **§18.3 1087–1088**; Contents 40; **§19 1154–1158**; **§21.2 1292**; **§23 1374–1375**; **§24 1392**; Q7 1411 | The API is built now, in this monorepo, contract first. D5 keeps its stack and the contracts package and loses "separate, later"; its rationale gains "running costs start in Phase 0 (roadmap §8)". §19's opening says what the contract is for now. The §23 row "Backend arrives after the app" becomes the risk that remains (app and API drift), with the mitigations ADRs 0041 and 0042 give. |
| A3, ADR 0073 | Accepted | SEC-02 1007; **§19.2 1177**; **§18.2 1060**; **§18.5 1145**; §19.1 1164 | SEC-02: a revocable server-side session and a device-held secret, both in `expo-secure-store`; the secret can start a new session for the same guest; it never appears in logs or analytics. §19.2's row says the same. The two "Secrets" rows read "session token and device secret". |
| A4, ADR 0042 | Accepted | §18.2 1064; **§18.4 1129**; **§19.6 1224–1235**; **§22 1310**; **§23 1375**; **§21.2 1292** | An in-process fake server in `packages/contracts`, injected at the client's transport, with the same scenarios. The scenario list stays. |
| A5, ADR 0043 | Accepted | §12.9 896; **§18.2 1076**; **§21.1 1276**; **§22 1303** | A development-only gallery route: every component in every state × light, dark and high contrast × default and largest text size. Revisit at V1. |
| A6, ADR 0056 | Accepted | §19.1 1160 | Postgres plus the CDN for caching and rate limits; no Redis at MVP; reconsidered for live events (V2). Leagues stay in Postgres. |
| A7, ADR 0041 | Accepted | §18.2 1063; **D5 61**; **§18.3 1090** | A thin client driven by the `contracts` endpoint registry that validates every response at run time; `hc` only in the admin console. D5's rationale stops crediting Hono's typed client. |
| A8, ADR 0035 | Accepted | §18.2 1050 | Skia for confetti and share cards only, loaded lazily; a new row for `react-native-svg`: the timer ring and bar. §9.2, §10.3 and §15.3 already say "ring" and "Reanimated" without naming Skia: no change. |
| A9, ADR 0074 | Accepted | Conventions 14; §22 1297–1363 (headings **1299**, **1314**, **1337**); **§23 1374**; **§24 1392** | §22 opens by handing the calendar to roadmap §5 and maps P0, MVP and V1 to V3 onto its phases and gates. The three durations go; the scope lists stay (the roadmap's DS-10 row cites "§22 (P0)", so the headings keep their names). "Solo" goes from §23 and §24. |
| A10, ADR 0075 | Accepted | 24 lines | See the citation table below. |
| A11, ADR 0076 | Accepted | ONB-06 282; §25 | ONB-06 unchanged. A note under §7.1's table says so and names the open question; Q10 in §25 carries it (roadmap O-7, `expo-age-range`, counsel's view due by M5). |
| A12, ADR 0077 | Accepted | Working title 10; Q1 1405 | Per P4. Q1 marked answered. |
| A13, ADR 0078 | Accepted | §22 1306 | At least 5 people across the personas try the prototype before G1; more sessions follow on real builds. |

### ADRs that hand work to this ticket

| Source | Status | Spec 1.0 lines | Change |
|---|---|---|---|
| ADR 0002 (with 0050, 0065) | Proposed; 0050 and 0065 Accepted | §21.1 1274; **§18.2 1077** | Unit row: "Vitest, fast-check" for the shared packages. The component row and §18.2 say Jest and Testing Library for the app, Vitest for the packages and the API. |
| ADR 0003 | Proposed | STK-03 206 | The sentence "Time-zone changes are credited at most once per 24 h, to prevent abuse." is replaced by the ADR's decision: a session is credited to the date in the device's IANA zone at the instant it completes, with no limit on zone changes. The rest of STK-03 stands. `docs/traceability.md` line 25 already says this. |
| ADR 0004 | Proposed | STK-01 204; STK-04 207; XP-01 217; XP-02 218; XP-03 219; XP-04 220; PLAY-02 305; after 211 and 220 | Per P5. Every row of the ADR's table lands: qualifying session, earning and spending freezes, frozen days, the day credited, best streak, the level curve, session XP, Practice XP, the offline cap, the goal ring. The values keep their *(tunable)* mark. DLY-03 (186) already says a replayed daily earns no XP. |
| ADR 0008 (with 0022) | Proposed | §11.3 704–715; §11.1 696 | §11.3 says what inline content is (text spans with the five marks, and `link`), adds a `link` row (an inline node with one canonical https address; a link can't hold a link), and says the `alt` and `transcript` a device renders are the block's. §11.1 per P2. SEC-08 (1013) and A11Y-10 (913) already agree: no change. |
| ADR 0024, S1 | Proposed; the roadmap's §4.3 and §7 say the same | §19.3 1189–1190; **§10.1 619** | The Global Daily's body is `GET /daily/global/:date/:contentVersion`, public and immutable, from the CDN; its session holds `contentVersion` and no questions; every other source carries its questions in the session. §10.1's Tier B bullet says where the keys are in each case. |
| ADR 0024, S5 | Proposed | §19.2 1180 | The client sends its IANA time zone and its UTC offset in minutes (local minus UTC, east positive). |
| ADR 0072 | Accepted | with A2 | Running costs start in Phase 0. |
| ADR 0073 | Accepted | with A3 | SEC-02 rewritten. |
| ADR 0074 | Accepted | with A9 | §22 updated; V1 is planned in detail only after G4. |
| ADR 0075 | Accepted | with A10 | |
| Typed answers (owner, 2026-11-21; EG-33 to EG-36) | Owner's ruling | QT-03 335 | "…accepted aliases and numeric tolerance. A typed answer is exact by default: it forgives no typo unless the question's author switches tolerance on for that question. Where it is on, the number of typos allowed scales with the answer's length *(tunable)*, and a number is never forgiven one (`docs/content/editorial-guidelines.md`, EG-33 to EG-36)." §7.4's type table (319) and §10.5 need no change. |

### Accepted ADRs that §3.3 doesn't list

Found by reading each accepted ADR against the spec. Done-when (a) covers them.

| Source | Spec 1.0 lines | Change |
|---|---|---|
| ADR 0036 | §15.3 971; §18.2 1053 | FlashList 2; Legend List is the fallback, not an equal choice. |
| ADR 0048 | §18.2 1074; §20 1241 | Sentry for crashes and EAS Observe for startup and navigation timing: both, not either. |
| ADR 0070 | §18.6 1148 | ESLint 9 and Prettier; "(or Biome)" goes. |
| ADR 0071 | §18.2 1078; §21.2 1282–1284 | GitHub Actions for checks and API deploys; EAS Build, Submit, Update and Workflows for the app. §21.2's heading loses "(EAS Workflows)". |
| ADRs 0051 to 0055, 0057 to 0060, 0062 | §19.1 1159–1165 | The stack is named, not assumed: Hono 4 on Node 26 in one image (API and worker), Fly.io, Postgres on Neon, Drizzle, pg-boss, Better Auth (no "or an equivalent"), R2 behind Cloudflare, usernames through a blocklist and a moderation service. Real time (V2) stays as written. |
| ADR 0057, 0045 | Q7 1411; §18.2 1066 | The auth provider is Better Auth. Q7 marked answered. |
| ADR 0062 | ONB-07 283 | Adds "every player starts with a generated username"; the rest stands. |
| ADR 0068 | §7.14 453; §18.3 1087; D3 59 | The admin console is `apps/admin`, a React Admin app on the same API, built in this monorepo during the MVP. |
| Roadmap §4.2, ADR 0033 | §18.3 1083–1097; §18.4 1118–1121 | The layout gains `game-rules`, `content-tools`, `design-tokens` and `content/`; `contracts` holds the endpoint registry and the fake server. The app's `design-system/tokens` reads from `packages/design-tokens`. |
| Roadmap §3.2 | §18.2 1051 | The mascot row's note gives today's reason for staying static (Rive's Nitro range conflicts with Unistyles; re-check at V1). |
| Roadmap §4.3 step 2, §7 | §10.1 618–621 | Tier B gains what the roadmap says of every completion: the server re-grades it with the shared engine against the session's question snapshot, and its result is authoritative while the app's is optimistic. The plausibility checks stay. The source table's cells don't change. |
| Roadmap DS-04 and FE-06 rows; DLY-04 | §12.9 874 | `DailyCard` lists three states where DLY-04 and the roadmap have four: it becomes available, in progress, completed, next unlock (countdown). |
| Roadmap FE-15 row; PLAY-07 | §9.1 554; §10.6 677 | Two status notes about the earlier codebase go: "once those exist" and "Today the Global Daily is the only session saved." PLAY-07 already requires resuming in every non-competitive mode. |
| ADR 0035 | §18.2 1069 | Share cards are drawn with Skia; "or `react-native-view-shot`" goes. |
| ADR 0062 | §19.1 1165 | Moderation at MVP is text (usernames); images need none until public content in V2. |
| ADR 0057, roadmap §4.3 | §19.5 1216 | One sentence: all game data is keyed to our own `player_id`, never to the auth library's user id. The entity list stays. |
| Roadmap §9, ADR 0030 | §23 1380 | "an upgrade window every quarter" becomes "in each phase". |
| Roadmap O-5, ADR 0052 | Q2 1406 | The markets are needed by FND-04, because they fix the hosting region; the languages stay "MVP end". |

---

## The 24 citations (A10)

`grep -nE 'ADR 00(0[89]|1[0-2])' docs/spec.md` on 1.0 returns 24 lines. ADR 0075 says what 0009, 0010 and 0011 meant; 0008 and 0012 are read from their context. A citation is replaced only where an ADR of this series records the same decision; otherwise it is removed, because the spec's own text states the behaviour.

| Line | Old | It was cited for | New |
|---|---|---|---|
| 15 | 0012 | A running quiz keeps the tunables it started with | removed |
| 187 | 0010 | DLY-04: Continue until the end of the daily's date | removed; "§10.6" |
| 190 | 0011 | DLY-07: today's and tomorrow's sets prefetched | removed; "§16" stays |
| 310 | 0010 | PLAY-07: leaving keeps the daily attempt | removed; "§10.6" |
| 347 | 0011 | RES-05: the pending-sync indicator | removed; "OFF-03" |
| 554 | 0010 | §9.1: an unfinished daily shows Continue on its card | removed; "DLY-04" stays |
| 580 | 0009 | §9.2: the 3-2-1 intro | removed; "§10.2" |
| 631 | 0009 | §10.2: `intro` to `presenting` | removed |
| 654 | 0009 | §10.3: the machine owns the deadline, the UI thread draws it | ADR 0037 (states it), ADR 0035 (the ring and bar) |
| 658 | 0010 | §10.3: a restored session pauses as of its last save | removed; "§10.6" stays |
| 677 | 0010 | §10.6: a snapshot per transition, in MMKV | ADR 0037 (the versioned adapter), ADR 0040 (MMKV) |
| 679 | 0011 | §10.6: completions go through the outbox | ADR 0040 |
| 804 | 0008 | §12.3: the countdown token uses the text face | removed |
| 958 | 0009 | §15.2: no React render per tick | removed; "§10.3" stays |
| 990 | 0011 | OFF-01: dailies prefetched, each kept as its session | removed |
| 992 | 0011 | OFF-03: the outbox, in MMKV | ADR 0040 |
| 996 | 0011 | OFF-07: the query cache persisted to MMKV | ADR 0038 |
| 1059 | 0011 | §18.2: the outbox is in MMKV | ADR 0040 |
| 1144 | 0011 | §18.5: the outbox and kept dailies in MMKV | ADR 0040 |
| 1178 | 0012 | §19.2: what `/config` returns | removed |
| 1190 | 0011 | §19.3: a daily's session is get-or-create | removed |
| 1231 | 0012 | §19.6: the expired-challenge scenario | removed |
| 1235 | 0012 | §19.6: the forced-update scenario | removed |
| 1291 | 0012 | §21.2: the forced-update screen | removed |

In this repository the same numbers are content blocks (0008, on `main`) and, on the unmerged FND-05 branch, `expo-observe` (0009), the Apple sign-in entitlement (0010), the Google sign-in library (0011) and the Gesture Handler pin (0012).

After the change the grep returns only the new citations of this series' ADR 0008 (content blocks) in §11.3.

---

## Order of work

One pull request, these commits, each ending `(FND-06)`:

1. `docs(plans): FND-06 plan`. This file.
2. `docs(spec): replace the earlier ADR series' citations`. The 24 lines only, so the diff can be read against the table above.
3. `docs(spec): fold roadmap §3.3 and the accepted ADRs into v1.1`. Header, conventions, A1 to A9, A11 to A13, and the unlisted accepted ADRs.
4. `docs(spec): fold ADRs 0002, 0003, 0004, 0008 and 0024, and exact typed answers`.
5. `docs(spec): appendix D` (if P6 is yes) and `docs(traceability): SEC-02 wording`. Line 130 reads "Tokens in SecureStore (amended: roadmap A3)" and becomes "Revocable session and device secret in SecureStore". No other row's wording is out of step (checked: STK-03, QT-03, XP, DLY-07, OFF rows).
6. Fixes from the independent review, if any.

## Proof, per done-when line

| Done when | How it is shown |
|---|---|
| (a) No section contradicts the roadmap or an accepted ADR | The map above, with 1.1's line numbers, in the pull request body: one row per amendment and ADR. Then a reviewer subagent in its own worktree, given the branch's spec, the roadmap and `docs/adr/` and asked to find contradictions that remain. It doesn't get this plan, the brief or my table. Its report goes in the pull request body in full; each finding is fixed or answered. |
| (b) Only citations right in this series | The grep's output on 1.1, and the 24-row table as old line, old number, new number or "removed". |
| (c) Every 1.0 ID present | `grep -oE '\b[A-Z0-9]+-[0-9]+\b' \| sort -u` on 1.0 (189 tokens, saved before the first edit) and on 1.1; `comm -23` must print nothing. Tokens 1.1 adds (EG-33, O-7 and the like) are listed too. |
| (d) `pnpm verify` green | Its output. Since Prettier skips `docs/`, a one-off script also checks every table in the spec: each row has as many cells as its header. It runs on 1.0 first, to show it passes there. |

## Risks walked

- **An ID renumbered or dropped.** Proof (c). Requirement rows are edited in place; no row is moved, split or merged.
- **A table row split by a pipe.** The cell-count script, on both versions.
- **An amendment folded in one place and not another.** The bold line numbers above are the second places; after the edit, a grep for each old term (`Storybook`, `MSW`, `refresh`, `Redis`, `Valkey`, `SDK 57`, `solo`, `separate`, `hc`, `Biome`, `interview`, `weeks`, `months`) must return only lines that are meant to keep it.
- **A `Proposed` ADR treated as binding.** Only the five the roadmap row and the brief name are folded.
- **A new fact invented.** Version and platform facts come from roadmap §3.1 and the ADRs only. Where 1.0 states something neither repeats (Android widgets in the SDK 58 beta), 1.1 keeps it with its date.
- **A meaning changed beyond the decision.** Each requirement row that changes is listed in the pull request body with its old and new text side by side.

## Proposed ADRs and the spec: differences to rule on, not folded

| ADR | Spec 1.0 | The ADR says |
|---|---|---|
| 0021 R3 | §10.5 672: "+10 for each consecutive correct answer, capped at +50" | The first correct answer earns no combo; the n-th in a row earns `min(10 × (n − 1), 50)`. The PM ruled it stands and the owner may overturn it. |
| 0021 R5 | §7.4 320: `ordering` has no scoring rule | All or nothing. |
| 0021 R6 | QT-03 335 | Typo tolerance on by default. Overruled by the owner (EG-33); the spec follows the owner (see "Typed answers"). The ADR still says the old thing. |
| 0024 S13 | §19.2 1178: `/config` returns "daily-set metadata" | `/config` has none: the spec doesn't say what it is and, with S1, nothing reads it. |
| 0024 S9 | §19.3 1190: a daily's session "expires at the end of the date" | `expiresAt` is when the date has ended everywhere on Earth; the app also stops at the end of the player's local date. |
| 0024 S11 | ONB-02 278, §19.3 1186 | `POST /auth/guest` is get-or-create on a device id and secret. Marked provisional until BE-03. |
| 0008 decision 7 | §11.3 says nothing of size | Limits: 32 blocks, 2,000 characters in a span, 500 in alt text, and so on. |
| 0020 | QT-01 333: a registry module contains "schema (zod), renderer, grader, accessibility behavior, editor form and analytics payload" | The engine's module holds the schemas and a pure `grade` only; renderers and editor forms are maps in the app and the admin console, keyed by type. |
| 0020 | §11.1 694: `payload` is "options or answer data per type" | A question is `{type, payload, key}`: the payload is safe to show a player and the answer is in `key`. |
| 0024 consequences | §19.2 1174: server time "on every session response" | The app may measure its clock from `/config`, `POST /auth/guest`, `POST /sessions` and `GET /me/progress`, and not from a completion's stored result. |

Not a difference, and left alone: ONB-04's "Passkeys arrive in V1" (roadmap §10 says they need a spike first; the scope stands), and `GET /daily/personal?date=` in §19.3 (not in `contracts` v0; it arrives with the Daily 5).
