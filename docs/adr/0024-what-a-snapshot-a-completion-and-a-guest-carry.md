# 0024. What a snapshot, a completion and a guest carry: the readings `contracts` v0 takes

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-21 |
| **Ticket** | `ENG-04` |
| **Requirements** | Spec §19.2, §19.3, §10.1, §10.3, §10.6, OFF-03, OFF-04, DLY-06, DLY-07, ONB-02, STK-02, STK-03; roadmap §4.3, §7; ADRs 0003, 0004, 0005, 0020, 0021 |

## Context

Spec §19.3 calls its endpoints "indicative", and roadmap §4.3 describes three flows without giving their shapes. Three neighbour packages handed requirements to this ticket, and the PM ruled that they must be met here:

- `quiz-engine` (ADR 0021): a snapshot carries what both sides score with, and a completion carries each answer with its time.
- `game-rules` (ADRs 0003 to 0005): bad rule values reach results as `NaN`, and the server may not know a phone's time zone.
- `content-blocks` (ADR 0008): see ADR 0022.

`packages/game-rules` is on pull request 3 and is an empty scaffold on this branch, which is stacked on pull request 5. These shapes are v0: BE-05 finalises the dailies and sessions against the approved flows, and BE-03 tests identity on a device.

## Decision

| # | Open point | Reading |
|---|---|---|
| S1 | Where the Global Daily's body is served | `GET /daily/global/:date/:contentVersion`, public and immutable. A Global Daily session holds `contentVersion` and no questions, and the app fetches the body from the CDN once per version. Every other source carries its question set in the session. The keys are in the body: a daily is Tier B (§10.1). The spec's `GET /daily/global?date=` gives way to roadmap §4.3 and §7. |
| S2 | The rules a session is scored with: values or a version | The values. Every set holds `rules: { scoring, tunables }` as it was built, so the server grades from the snapshot alone and a daily prefetched yesterday is scored offline with what it started with. |
| S3 | What a question in a snapshot carries | The engine's `{ type, payload, key }` under `question`; `locale`, `difficultyMultiplier` and `standardLimitMs`, frozen when the set was built; `id`, `version`, `domain`, the prompt, the explanation with its sources, and the renderings (ADR 0022). |
| S4 | What a completion carries | `engineVersion`; `startedAt` and `completedAt` by the device's clock; `serverOffsetMs`, the server's clock minus the device's as last measured, or `null`; `timeZone` and `utcOffsetMinutes`; and one entry per question in the order answered: the tagged answer or `null`, `elapsedMs` in whole milliseconds with pauses left out, `timed`, and `pausedMs`. It carries no score: the body is strict and a claimed total is refused. |
| S5 | The device's zone | `timeZone` is checked for its spelling only, because whether a zone exists depends on the reader's zone data (ADR 0005). `utcOffsetMinutes` is local time minus UTC, east positive, from −720 to +840: Kathmandu is +345. It is the negative of JavaScript's `getTimezoneOffset()`. |
| S6 | The engine version | A positive integer. This package defines no constant for it, because the engine exports none. |
| S7 | What the server answers | The engine's `SessionEvaluation`, field for field, so the app can compare it with its own; `creditedDate`; `xpEarned`; `percentile` or `null`; and the player's `progress` with the completion counted. |
| S8 | How a snapshot and a completion become the engine's input | One function here, `sessionItemsOf`: items in the order answered, each with the snapshot's question, locale and multiplier, and the snapshot's Standard limit when the answer was timed. It refuses a question the set doesn't hold, one left out and one repeated. |
| S9 | When a session expires | `expiresAt` is an instant. For a daily it is when the date has ended everywhere on Earth; the app also stops at the end of the date where the player is (§10.6). |
| S10 | A completed session | `status` is `completed` and `result` holds the stored result, so a second device shows the same one. An open session has `result: null`. |
| S11 | Guest identity (**provisional until BE-03**) | The device makes a `deviceId` and a `deviceSecret` of 256 bits or more and keeps them in its secure store. `POST /auth/guest` is get-or-create on the pair: it creates the guest, or finds the device's player and starts a new session. It answers with our `playerId` and a bearer session token. |
| S12 | What "today" is for progress | The app sends its `timeZone` and `utcOffsetMinutes` with `GET /me/progress`, as a completion does, and the answer says which date it took as today (`asOfDate`). |
| S13 | `/config` | `version`, `serverTime`, `minAppVersion` and `updateUrl` per platform, `flags`, and `tunables`: the engine's scoring, timing and type tunables and the game rules. No "daily-set metadata" (§19.2): the spec doesn't say what it is, BE-01's done-when doesn't name it, and with S1 nothing reads it. |
| S14 | The game rules and their three lists | Schemas written here to match `GameRules`, `SessionSource`, `PlayMode` and `DailyGoalTier` on the `game-rules` branch. Counts are whole and bounded, `practiceFactor` is from 0 to 1, `stepXp` is at least 1, milestones rise strictly, and no goal is above the next tier. |
| S15 | What v0 holds | Twelve endpoints: config, guest, `/me`, device registration, domains, quizzes, the daily body, sessions, completion and progress. Sign-in, linking and deletion (BE-16, BE-17), topic pages, collections and search (BE-13, BE-19), challenges, reports and notification preferences arrive with the tickets that build them. |

## Alternatives considered

| Alternative | Why not |
|---|---|
| Questions inside every session, the daily's too | Every player's prefetch would pull the same body through the origin; roadmap §4.3 puts it on the CDN to keep local midnight from becoming a spike. |
| A config version in the snapshot instead of the values | The server would keep every config it ever served, and a device offline at the change couldn't score what it holds. |
| Let the completion carry the device's score | The server grades again anyway, and a field nobody reads is a field somebody will trust later. The app compares the server's evaluation with its own. |
| Send a time already corrected by the offset | The server could no longer tell a wrong clock from a late sync. Two raw facts can be audited. |
| The offset alone, with no zone id | DST and late sync make an offset a guess for any other instant; the zone is what ADR 0003 credits by. |
| A secret made by the server and returned once | A retry after a lost response would need the plaintext secret kept in an idempotency store, or would make a second guest. |

## Consequences

- **BE-05** finalises S1, S9 and S10, and decides how a content version is made. A version that can't be guessed keeps tomorrow's answers out of reach of anyone without a session.
- **BE-03** confirms or replaces S11, and decides between a bearer token and a cookie.
- **BE-06** checks what the schema can't: that an offset belongs to its zone where the zone is known, and that times are plausible (SEC-05). A `completedAt` before its `startedAt` is such a signal and not a refusal: a phone's clock can be set back mid-session, and a completion the schema refused would sit in the outbox for good. BE-06 also sets the body-size limit ADR 0021 asks for.
- **Which `serverTime` the app may measure its clock from.** A fresh answer's: `/config` (served `no-cache`, so a 200 is never a stored copy), `POST /auth/guest`, `POST /sessions` and `GET /me/progress`. Not a completion result's, because a retry under the same key gets the stored result back with the time it was first made; and not the `result` inside a session. A 304 from `/config` has no body, so the app reads `Date` then.
- **FE-07** prefetches a daily in two steps: `POST /sessions`, then the body the session names.
- **Not verified here:** that S14's schemas and `game-rules`' types agree. Proposed, once pull request 3 merges: a test that each schema's type and the package's type are assignable both ways.
- Proposed for `quiz-engine`: export an `engineVersion` constant (S6).
- FND-06 should fold S1 and S5 into spec v1.1.
