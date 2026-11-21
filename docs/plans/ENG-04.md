# ENG-04 `packages/contracts` v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ticket:** ENG-04 · **Status:** APPROVED on 2026-11-21, in the engineer's session; approval confirms decisions D1 to D10 below · **Owner:** fullstack engineer · **Size:** M, confirmed: one package, a new pattern (the endpoint registry), no schema migration or write path of its own.

**Goal:** One pure TypeScript package that holds every wire shape of the first six API areas as zod schemas, an endpoint registry the client, the API and the fake server all read, the error catalogue, and fixtures, and that generates an OpenAPI 3.1 document from the registry.

**Architecture:** An endpoint is a plain data object (`id`, method, path, access, input schemas, success schema, error codes). The registry is the list of them. `generateOpenApi()` is a pure function that turns the list into a document using zod's own `z.toJSONSchema()`; no generator library. Schemas the engine and the block package already own are embedded, never restated. Published forms of content (math SVG, code tokens, media files) travel beside the authored blocks, not inside them.

**Tech stack:** TypeScript ~6.0 strict · zod `^4.6.7` from the pnpm catalog · Vitest 5 from the root config · test-only: `@seriousme/openapi-schema-validator` `^2.12.0` and `ajv` `^8`.

**Spec:** `docs/spec.md` §19.2, §19.3, §10.1, §10.3, §10.5, §10.6, §11.1–11.3, §16 · `docs/roadmap.md` §3.1, §3.3 (A3, A7), §4.3, §7 and the ENG-04 row · ADRs 0003–0005 (on `feat/ENG-03-game-rules`), 0008, 0020, 0021 · "Notes for neighbouring tickets" in `docs/plans/ENG-02.md`.

**Branch:** `feat/ENG-04-contracts`, stacked on `feat/ENG-02-quiz-engine` because pull requests 4 and 5 are still open. The pull request will say so. `packages/game-rules` is an empty scaffold on this stack, so nothing can be imported from it (see decision D7).

---

## Changes during the build

The plan below is as approved. These are the places where what was built differs from it.

1. **The SVG check is an allowlist grammar, not a list of refused patterns** (Task 3, D1). An automated review of each commit found three ways past the first versions: a slash in place of a space before an event handler, markup held in an attribute value inside `<title>`, and a no-break space a browser doesn't treat as white space. The check moved to its own file, `src/svg.ts`, and now accepts only named elements and attributes, quoted values, the four white-space characters XML and HTML share, and no `<` or `>` outside a tag. ADR 0022 has the rules.
2. **`sessionItemsOf` has a third refusal, `repeated_question`** (Task 5). The schema refuses a repeat, but the function also takes typed values that never met the schema.
3. **`sharedSchemas` names more schemas than Task 6 listed:** `Blocks`, `Config`, `ImageAsset`, `PlayerQuestionItem`, `SessionRules`, `Player`, `Quiz` and `Session`, so the document repeats less and a shared body isn't named after one endpoint.
4. **Tasks 6 and 7 are one commit.** The public-API test and the package's third entry point need the generator to exist.
5. **The generator doesn't refuse a transform** (Task 7). On the input side zod writes a transform as its input. A `Date` or a `bigint` still throws. The no-transform rule is held by `tests/fixtures.test.ts` instead: every fixture comes back unchanged.
6. **`problemOf(code, extras)` was added to `errors.ts`,** so the API, the fake server and the fixtures build a problem from the catalogue one way.
7. **Tests and code for Tasks 2 to 7 were written together, not red first.** To show the tests bite, ten rules were then broken one at a time (a level step of zero, an optional offset, fractional time, a keyless item that isn't strict, `script` allowed in math, a 3.0 document, a completion with no idempotency key, a result off by one point, a tolerant request, a strict response). A test failed for each.

## Context

Roadmap §2 rule 4 and §7 require every endpoint to exist as a schema in `contracts` before the API or the app implements it. BE-01 (`GET /config`), BE-03 (guest identity), BE-05 and BE-06 (dailies and the completion write path) and FE-05 (validating client and fake server) all wait on this package. Three neighbour packages have handed it requirements, which the PM has ruled must be met here: what a session snapshot and a completion carry (ENG-02), where published math and code live (ENG-01), and schemas that keep bad values out of the game rules (ENG-03).

## Library check (2026-11-21)

Checked against zod.dev, the zod 4.6.7 source, npm and the OpenAPI Initiative's site; full notes are in the shared notes folder, `eng-04-openapi-research.md`.

- **zod 4.6.7 `z.toJSONSchema()`** targets JSON Schema 2020-12, which is the schema dialect of OpenAPI 3.1. Run locally against this branch: it converts `mvpRegistry.questionSchema`, `playerQuestionSchema`, `answerSchema`, `tunablesSchema`, `scoringConfigSchema`, `timingConfigSchema` and `gradeSchema` without error; refinements are dropped silently; a transform or a `Date` throws; the registry form with `uri: (id) => '#/components/schemas/' + id` emits cross-references between named schemas.
- **Rejected:** `zod-openapi` 6.0.2 (sound, zero dependencies, but it wraps the same call and wants `.meta()` on schemas this package doesn't own), `@asteasolutions/zod-to-openapi` 9.1.0 (own converter, pulls `openapi3-ts` and `yaml`), `@hono/zod-openapi` and `hono-openapi` (need a Hono app; the mobile app imports this package), `zod-to-json-schema` (deprecated, zod 3 only).
- **OpenAPI:** 3.1.2 is the latest 3.1 patch. 3.2 exists but `openapi-typescript` and `swagger-parser` don't read it yet, so 3.1 stays the target.
- **Test-only validators:** `@seriousme/openapi-schema-validator` 2.12.0 (ESM, bundles the official 3.1 schema) checks the document's structure; `ajv` (2020 build) compiles every component schema and validates fixtures against them.

## Decisions for the PM to confirm

Approving this plan confirms these. Each becomes a row in an ADR.

| # | Decision | Why | ADR |
|---|---|---|---|
| D1 | Published forms live in `contracts`, as a **sidecar** beside authored blocks: `renderings: { media, math, code }`, matched to a block by `assetId`, by LaTeX source, and by language plus source. | The PM ruled that player-facing questions parse with the engine's player-question schema, whose payloads hold strict authored blocks; a math block refuses an `svg` key (ADR 0008). A sidecar leaves the snapshot identical to the stored question, so both sides grade the same JSON. Nobody authors a published form, so it is a wire shape. | 0022 |
| D2 | The Global Daily body is `GET /daily/global/:date/:contentVersion`, public and immutable. A daily session carries `contentVersion` and no questions; the app fetches the body from the CDN. Other sources carry their question set inline. | Roadmap §4.3 ("a URL that includes the date and content version") and §7 (immutable URLs, never purged) win over the spec's `?date=`. Keys are in the body: it is Tier B (§10.1). | 0024 |
| D3 | A snapshot embeds the **values** of the scoring config and type tunables it started with, not a version number. | A prefetched daily is played offline; the server re-grades from the snapshot alone and needs no store of old configs. | 0024 |
| D4 | Guest identity v0: the device generates `deviceId` and `deviceSecret`; `POST /auth/guest` is get-or-create on that pair and returns a bearer session. **Provisional until BE-03.** | A lost response is retried safely with no plaintext secret in an idempotency store, and the same call mints a new session when one expires (roadmap §4.3). | 0024 |
| D5 | Requests are strict objects. Response objects this package defines drop unknown keys. Embedded engine and block schemas stay strict. No transforms or defaults; the one coercion is a numeric query parameter. | App binaries lag the server (roadmap §3.1): a field added to a response must not break a shipped app. A new question type or tunable still needs a server-side gate, because the engine's schemas are strict by their own ADRs. | 0023 |
| D6 | `/config` v0 carries no "daily-set metadata" (§19.2). | The spec doesn't say what it is, BE-01's done-when doesn't name it, and with D2 nothing reads it. Adding it later is compatible (D5). | 0024 |
| D7 | `GameRules`, `SessionSource`, `PlayMode` and `DailyGoalTier` are validated by schemas written here to match `packages/game-rules` on its branch, read with `git show`. | That package isn't on this stack. A compile-time parity check is a proposed follow-up once pull request 3 merges. | 0024 |
| D8 | `engineVersion` in a completion is a positive integer; this package defines no constant for it. | `quiz-engine` exports none and is outside this ticket. Proposed follow-up: the engine exports its version. | 0024 |
| D9 | "Content" in v0 is taxonomy and quizzes: `GET /domains`, `GET /quizzes`, `GET /quizzes/:quizId`. Topic pages, collections and search arrive with BE-13 and BE-19; linking, deletion, challenges, reports and notification preferences with their own tickets. | Each has an owner in Phase 3 and no consumer before it. The quiz list gives the registry its cursor-pagination example (§19.2). | — |
| D10 | No v0 endpoint serves a keyless question (Tier B sessions carry keys). `playerQuestionItemSchema` and `toPlayerQuestionItem()` are built and tested for previews and Tier A. | The PM's ruling needs a shape that refuses a key; the projection copies named fields, as the engine's `toPlayerQuestion` does. | 0022 |

---

## Global Constraints

- `src/` imports only `zod`, `@repo/content-blocks` and `@repo/quiz-engine`. Nothing from React Native, `node:*` or the network; no `Date`, `Intl`, `Math.random`, `process`, `fetch`. A test holds this.
- Relative imports carry `.ts`. `import * as z from 'zod'`.
- Embedded, never restated: `mvpRegistry.questionSchema`, `.playerQuestionSchema`, `.answerSchema`, `.tunablesSchema`, `scoringConfigSchema`, `timingConfigSchema`, `gradeSchema` from `@repo/quiz-engine`; `blocksSchema`, `blockLimits`, `isHttpsUrl` from `@repo/content-blocks`.
- Timestamps are ISO 8601 UTC with a `Z` (`z.iso.datetime()`); calendar dates are `YYYY-MM-DD` (`z.iso.date()`); durations are whole milliseconds.
- `utcOffsetMinutes` is local time minus UTC, east positive, from −720 to +840. Kathmandu is +345. It is the negative of JavaScript's `getTimezoneOffset()`.
- Every array and string has an upper bound.
- Nothing outside `packages/contracts`, `pnpm-lock.yaml`, `docs/plans/ENG-04.md` and `docs/adr/0022`–`0024` changes. `docs/traceability.md` is untouched: no row lists ENG-04.
- Conventional commits ending `(ENG-04)`; `pnpm verify` green before each commit; `git config user.email` already confirmed as a `users.noreply.github.com` address.

## Review Focus

1. **A newer server and an older app.** A response with an unknown field still parses; a request with one is refused. Task 1, `tests/endpoint.test.ts`.
2. **A key or an explanation riding along on a keyless question.** `playerQuestionItemSchema` refuses both, at the item and inside `question`. Task 3.
3. **Hostile markup in a math rendering.** `<script>`, an event handler, an external `href`, `<foreignObject>`, a doctype: each refused. Task 3.
4. **A completion that doesn't fit its snapshot.** A repeated, missing or unknown question id is refused before anything is graded. Task 5.
5. **Garbage game rules from remote config.** `NaN`, a zero level step, a negative count, milestones out of order: refused, so no `NaN` reaches a ledger. Task 2.

---

## File structure

```
packages/contracts/
  package.json            deps, three exports: ".", "./fixtures", "./openapi"
  tsconfig.json           include src and tests, exclude tests/node
  src/
    index.ts              public API, re-exports by name
    primitives.ts         ids, slugs, timestamps, dates, time zone, offset, locale, app version, https URL, pagination
    errors.ts             error codes, the catalogue, the problem-details schema
    endpoint.ts           Endpoint, defineEndpoint, Access, Area, header schemas, inferred request and response types
    rules.ts              sessionSource, playMode, dailyGoalTier, gameRules
    published.ts          media assets, math and code renderings, renderings, lookups
    questions.ts          sessionQuestion, playerQuestionItem, questionSet, toPlayerQuestionItem
    areas/config.ts       config schema and endpoint
    areas/identity.ts     guest, player, device schemas and endpoints
    areas/content.ts      domains, quizzes
    areas/dailies.ts      the Global Daily set
    areas/progress.ts     progress
    areas/sessions.ts     create, session, completion, result, sessionItemsOf
    endpoints.ts          the registry: `endpoints`, `endpointList`, `sharedSchemas`
    openapi.ts            generateOpenApi
    fixtures/             one file per area, plus index.ts with the `fixtures` list
  tests/                  one file per src file, plus fixtures.test.ts and public-api.test.ts
  tests/node/             tsconfig with Node types; boundaries.test.ts, openapi-validity.test.ts
```

## The registry (v0, 12 endpoints)

| id | Method and path | Access | Notes |
|---|---|---|---|
| `config.get` | `GET /config` | public | ETag, 304 |
| `auth.guest` | `POST /auth/guest` | public | get-or-create on the device credential |
| `me.get` | `GET /me` | player | |
| `me.update` | `PATCH /me` | player | `dailyGoal` |
| `devices.put` | `PUT /devices/:deviceId` | player | 204 |
| `content.domains` | `GET /domains` | public | ETag |
| `content.quizzes` | `GET /quizzes` | public | `cursor`, `limit`, `nextCursor` |
| `content.quiz` | `GET /quizzes/:quizId` | public | ETag |
| `dailies.globalSet` | `GET /daily/global/:date/:contentVersion` | public | immutable |
| `sessions.create` | `POST /sessions` | player | get-or-create for a daily; accepts tomorrow |
| `sessions.complete` | `POST /sessions/:sessionId/complete` | player | `Idempotency-Key` required |
| `progress.get` | `GET /me/progress` | player | query `timeZone` |

`Access` is `'public' | 'player' | 'admin'`; no admin endpoint exists in v0 (the admin console uses `hc`, roadmap A7).

---

## Tasks

### Task 1: Package wiring, primitives, errors, the endpoint shape

**Files:** modify `packages/contracts/package.json`, `tsconfig.json`, `src/index.ts`; create `src/primitives.ts`, `src/errors.ts`, `src/endpoint.ts`, `tests/primitives.test.ts`, `tests/errors.test.ts`, `tests/endpoint.test.ts`, `tests/node/tsconfig.json`, `tests/node/boundaries.test.ts`.

**Produces:**
- `primitives.ts`: `idSchema` (`/^[A-Za-z0-9_-]{1,64}$/`), `slugSchema` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤ 64), `isoTimestampSchema`, `localDateSchema`, `timeZoneSchema` (IANA grammar, ≤ 64, syntax only), `utcOffsetMinutesSchema` (int, −720 to 840), `localeSchema`, `appVersionSchema` (`/^\d{1,4}\.\d{1,4}\.\d{1,4}$/`), `platformSchema` (`ios | android | web`), `httpsUrlSchema` (refined with `isHttpsUrl`), `countSchema` (int, 0 to 1,000,000,000), `cursorSchema`, `pageQueryShape` (`cursor?`, `limit?` coerced int 1–50), `pageOf(item)`.
- `errors.ts`: `errorCodes`, `ErrorCode`, `errorCatalog: Record<ErrorCode, { status; title }>`, `isErrorCode`, `problemSchema` (RFC 9457: `type`, `title`, `status`, `code`, optional `detail`, `instance`, `requestId`, `issues[]`, `retryAfterSeconds`; `code` accepts any snake-case string so an older app can read a newer code).

  | Code | Status | Code | Status |
  |---|---|---|---|
  | `invalid_request` | 400 | `session_expired` | 410 |
  | `idempotency_key_required` | 400 | `payload_too_large` | 413 |
  | `unauthenticated` | 401 | `idempotency_key_reused` | 422 |
  | `device_credential_invalid` | 401 | `rate_limited` | 429 |
  | `forbidden` | 403 | `internal_error` | 500 |
  | `not_found` | 404 | `service_unavailable` | 503 |
  | `daily_not_available` | 404 | `request_in_progress` | 409 |

- `endpoint.ts`: `Endpoint<TParams, TQuery, TBody, TResponse>` with `id`, `area`, `method`, `path` (Hono style, `:param`), `access`, `summary`, `params`, `query`, `body` (each a schema or `null`), `idempotencyKey: boolean`, `caching: 'none' | 'etag' | 'immutable'`, `success: { status: 200 | 201 | 204; body }`, `errors: readonly ErrorCode[]`; `defineEndpoint()`; `ParamsOf`, `QueryOf`, `BodyOf`, `ResponseOf`; `idempotencyKeySchema` (`/^[A-Za-z0-9_-]{16,64}$/`); `headerNames`.

- [ ] Wire the package: dependencies `zod` (`catalog:`), `@repo/content-blocks`, `@repo/quiz-engine` (`workspace:*`); dev dependencies `@seriousme/openapi-schema-validator`, `ajv` (confirm the current versions with `pnpm view` first); `typecheck` becomes `tsc --noEmit && tsc --noEmit -p tests/node`; run `pnpm install`.
- [ ] Write the failing tests, then the code:
  - `primitives.test.ts`: "a timestamp must be UTC with a Z" (refuses `+05:45` and a missing seconds field); "a date must exist" (refuses `2026-02-30`, accepts `2028-02-29`); "an offset runs from −720 to +840" (accepts 345, 765, 840; refuses 841, 5.5, `NaN`); "a time zone is an IANA id" (accepts `Asia/Kathmandu`, `America/Argentina/Buenos_Aires`, `Etc/GMT+12`, `UTC`; refuses `''`, a space, 65 characters); "an https URL only" (refuses `http://`, a port, `javascript:`).
  - `errors.test.ts`: "every code has one status and a title"; "a problem with a code this build doesn't know still parses"; "a problem keeps extension members out of the parsed value".
  - `endpoint.test.ts`: "a response object drops a field it doesn't know and a request object refuses one" (Review Focus 1), using a toy endpoint; "ResponseOf and BodyOf infer the schema's type" (`expectTypeOf`).
  - `tests/node/boundaries.test.ts`: "src imports only zod and the two workspace packages"; "every relative import ends in .ts"; "src reads no clock, locale, randomness or platform".
- [ ] `pnpm verify`, commit `feat(contracts): primitives, error catalogue and the endpoint shape (ENG-04)`.

### Task 2: Game rules and `/config`

**Files:** create `src/rules.ts`, `src/areas/config.ts`, `src/fixtures/config.ts`, `tests/rules.test.ts`, `tests/config.test.ts`.

**Produces:**
- `sessionSourceSchema` (`global_daily | daily_5 | quiz | challenge`), `playModeSchema` (`standard | relaxed | practice`), `dailyGoalTierSchema` (`casual | regular | serious`).
- `gameRulesSchema`, strict, shaped as `GameRules` in `packages/game-rules/src/rules.ts`: `streak.minQuestions` int ≥ 1; `streak.milestones` ints ≥ 1, strictly rising, ≤ 32 of them; `streak.maxFreezesHeld`, `streak.freezesPerMilestone` ints ≥ 0; `xp.perSession`, `xp.perCorrectAnswer`, `xp.perfectBonus`, `xp.offlineDailyCap` ints 0 to 1,000,000; `xp.practiceFactor` a number 0 to 1; `levels.stepXp` int 1 to 1,000,000; `dailyGoal` three ints ≥ 1 with casual ≤ regular ≤ serious.
- `configSchema`: `version`, `serverTime`, `minAppVersion { ios, android }`, `updateUrl { ios?, android? }`, `flags` (record of snake-case key to boolean), `tunables { scoring, timing, questionTypes, gameRules }`.
- `getConfig` endpoint; `configFixture`, with the game rules of ADR 0004's table and the engine's `specScoringConfig`, `specTimingConfig`, `specMvpTunables`.

- [ ] Failing tests, then code:
  - `rules.test.ts` (Review Focus 5): "the defaults of ADR 0004 parse"; one case each for `NaN`, `Infinity`, a fraction where a count belongs, a negative count, `stepXp: 0`, `practiceFactor: 1.5`, milestones `[7, 3]` and `[3, 3]`, `casual` above `regular`, an unknown key; "a source, a mode and a tier outside the lists are refused".
  - `config.test.ts`: "the config fixture parses"; "a scoring config the engine refuses is refused here" (`minRating` above `maxRating`); "a tunable for a type the engine doesn't hold is refused"; "an update URL must be https".
- [ ] `pnpm verify`, commit `feat(contracts): game-rule schemas and the config contract (ENG-04)`.

### Task 3: Published forms and question items (D1, D10)

**Files:** create `src/published.ts`, `src/questions.ts`, `src/fixtures/questions.ts`, `tests/published.test.ts`, `tests/questions.test.ts`.

**Produces:**
- `imageAssetSchema` `{ assetId, kind: 'image', width, height, placeholder: { kind: 'blurhash' | 'thumbhash', hash } | null, sources: [{ url, format, width, bytes }] }` (1–12 sources); `audioAssetSchema` `{ assetId, kind: 'audio', durationMs ≤ 30000, sources: [{ url, format, bytes }] }`. No `alt` or `transcript`: the block carries them (ADR 0008).
- `mathRenderingSchema` `{ latex, svg, widthEx, heightEx }`. `svg` is at most 200,000 units, starts with `<svg` and ends with `</svg>`, and refuses `<script`, `<foreignObject`, `<iframe`, `<object`, `<embed`, `<image`, `<style`, `<a`, `<!`, `<?`, an `on…=` attribute, `javascript:`, `data:`, an `href` that isn't a `#fragment`, and a `url(` that isn't one. This is a guard behind a trusted generator, not a sanitizer.
- `codeRenderingSchema` `{ language, source, lines: [[{ text, kind }]] }`, refused unless the token texts, joined line by line with `\n`, equal `source`. `kind` is a lowercase word; `codeTokenKinds` lists the eleven the app colours (`plain`, `keyword`, `string`, `number`, `comment`, `function`, `type`, `variable`, `constant`, `operator`, `punctuation`), and an unknown kind is rendered as `plain`.
- `renderingsSchema` `{ media, math, code }`, each a bounded list with no repeated key.
- `mathRenderingOf(block, renderings)`, `codeRenderingOf(block, renderings)`, `assetOf(assetId, renderings)`, `unrenderedBlocks(blocks, renderings): Block[]`.
- `sessionQuestionSchema` `{ id, version, domain, locale, difficultyMultiplier (0 < m ≤ 10), standardLimitMs (1 to 600,000), prompt: blocksSchema, question: mvpRegistry.questionSchema, renderings, explanation: { blocks, sources: [{ title, url }] (1–10), renderings } }`. `renderings` covers the prompt and the payload; the explanation has its own, so a keyless view can leave them behind.
- `playerQuestionItemSchema`, strict: the same fields without `explanation`, with `question: mvpRegistry.playerQuestionSchema`.
- `toPlayerQuestionItem(item)`: copies the named fields and calls the engine's `toPlayerQuestion`.
- `questionSetSchema` `{ rules: { scoring: scoringConfigSchema, tunables: mvpRegistry.tunablesSchema }, questions }` (1–50 questions, ids unique).
- Fixture questions: eight, across the five types and at least five domains, one prompt with a math block and one with a code block, one `image_choice`; every fact checkable.

- [ ] Failing tests, then code:
  - `published.test.ts`: "a MathJax-shaped SVG parses"; "hostile markup is refused" as a table, one row per construct above (Review Focus 3); "tokens must spell the source"; "an unknown token kind parses"; "a rendering listed twice is refused"; "unrenderedBlocks names the math, code, image and audio blocks with no rendering, and an image block matched to an audio asset".
  - `questions.test.ts`: "a session question carries what the engine scores with" (dropping `locale`, `difficultyMultiplier` or `standardLimitMs` fails); "a keyless item refuses a key, an explanation and sources" (Review Focus 2); "toPlayerQuestionItem output parses as a keyless item and holds no explanation rendering"; "a question the engine's check refuses is refused" (a key naming no option); "question ids are unique in a set"; "every fixture question's blocks have their renderings".
- [ ] `pnpm verify`, commit `feat(contracts): published forms beside the blocks, and question items (ENG-04)`.

### Task 4: Identity and content

**Files:** create `src/areas/identity.ts`, `src/areas/content.ts`, `src/fixtures/identity.ts`, `src/fixtures/content.ts`, `tests/identity.test.ts`, `tests/content.test.ts`.

**Produces:**
- `guestRequestSchema`, strict `{ deviceId, deviceSecret }` (`/^[A-Za-z0-9_-]{43,128}$/`); `guestResponseSchema` `{ playerId, isNew, session: { token, expiresAt }, serverTime }`; `playerSchema` `{ playerId, kind: 'guest' | 'registered', dailyGoal, createdAt }`; `updatePlayerSchema`, strict `{ dailyGoal }`; `deviceSchema`, strict `{ platform, appVersion, locale, timeZone, pushToken: string | null }`.
- `domainsSchema` `{ domains: [{ slug, name, topics: [{ slug, name }] }] }`; `quizSchema` `{ id, version, title, description | null, cover: imageAsset | null, domain, topic | null, locale, questionCount, estimatedSeconds, difficulty: 'easy' | 'medium' | 'hard', questionTypes: string[] }`; `quizPageSchema = pageOf(quizSchema)`; `quizzesQuerySchema`, strict `{ domain?, topic?, cursor?, limit? }`.
- Endpoints `authGuest`, `getMe`, `updateMe`, `putDevice`, `getDomains`, `listQuizzes`, `getQuiz`; fixtures for each input and response, including an empty quiz page and a last page (`nextCursor: null`).

- [ ] Failing tests, then code: "a device secret shorter than 43 characters is refused"; "a guest request refuses an extra field"; "limit is read from a query string and capped at 50" (`'20'` gives 20; `'51'`, `'0'`, `'abc'` fail); "a quiz may list a question type this build doesn't know"; "a page with no items and no cursor parses".
- [ ] `pnpm verify`, commit `feat(contracts): identity and catalogue contracts (ENG-04)`.

### Task 5: Dailies, progress, sessions and the completion (D2, D3, D8)

**Files:** create `src/areas/dailies.ts`, `src/areas/progress.ts`, `src/areas/sessions.ts`, three fixture files, `tests/dailies.test.ts`, `tests/progress.test.ts`, `tests/sessions.test.ts`.

**Produces:**
- `globalSetParamsSchema` `{ date, contentVersion }`; `dailySetSchema` = the question set plus `date`, `contentVersion`.
- `progressQuerySchema`, strict `{ timeZone }`; `progressSchema` `{ serverTime, asOfDate, xp: { total, today }, level ≥ 1, streak: { current, best, freezesHeld, status: 'inactive' | 'lit' | 'at_risk' | 'frozen', lastCreditedDate | null }, dailyGoal: { tier, target } }`.
- `createSessionSchema`, a strict union on `source`: `{ source: 'global_daily', date }`, `{ source: 'daily_5', date }`, `{ source: 'quiz', quizId, mode }`. A challenge session is created by accepting a challenge (BE-15).
- `sessionSchema`, a union on `source` over the common fields `id`, `mode`, `status: 'open' | 'completed'`, `createdAt`, `expiresAt`, `serverTime`, `result | null`: `global_daily` adds `date`, `contentVersion`; `daily_5` adds `date`, `set`; `quiz` adds `quizId`, `quizVersion`, `set`.
- `completionSchema`, strict: `engineVersion` (int ≥ 1), `startedAt`, `completedAt`, `serverOffsetMs` (int or `null`: the server's clock minus the device's as last measured, OFF-04), `timeZone`, `utcOffsetMinutes`, `answers` (1–50, question ids unique), each `{ questionId, answer: mvpRegistry.answerSchema or null, elapsedMs (int, 0 to 86,400,000), timed: boolean, pausedMs (int ≥ 0) }`, in the order answered.
- `sessionEvaluationSchema: z.ZodType<SessionEvaluation>` (`grades` with `gradeSchema`, `score` as the engine's `SessionScore`, all points ints ≥ 0).
- `completionResultSchema` `{ sessionId, serverTime, creditedDate, evaluation, xpEarned, percentile (int 0–100 or null), progress }`.
- `sessionItemsOf(set, completion)`: `{ ok: true; items: SessionItem[] } | { ok: false; reason: 'unknown_question' | 'missing_question' }`. It builds the engine's input the one way both sides must: items in the completion's order, each with the snapshot's `question`, `locale` and `difficultyMultiplier`, and `timing` of `{ timed: true, elapsedMs, standardLimitMs }` or `{ timed: false }`.
- Endpoints `getGlobalDailySet`, `getProgress`, `createSession`, `completeSession` (errors: `not_found`, `session_expired`, `idempotency_key_required`, `idempotency_key_reused`, `request_in_progress`, `payload_too_large`); fixtures: the eight-question Global Daily set, its open session, an inline `daily_5` session, a completion with six correct, one wrong and one timed out, its result, and progress for a new player and for a 100-day streak.

- [ ] Failing tests, then code:
  - `sessions.test.ts`: "a completion carries the zone id and its offset" (dropping either fails); "an answer is a tagged answer or null" (a bare string fails); "elapsed time is whole milliseconds" (12.5 fails); "a question answered twice is refused" (Review Focus 4); "sessionItemsOf refuses an id the set doesn't hold and a set question with no answer" (Review Focus 4); "an untimed answer becomes `{ timed: false }` and carries no limit"; **"the engine's evaluation of the completion fixture against the set fixture equals the result fixture"** (`evaluateSession(mvpRegistry, items, set.rules.tunables, set.rules.scoring)`); "a daily session holds a content version and no questions"; "a quiz session holds its set".
  - `dailies.test.ts`: "the daily set fixture parses, and its date and version are the endpoint's params".
  - `progress.test.ts`: "counts are whole and never negative"; "a streak status outside the four is refused".
- [ ] `pnpm verify`, commit `feat(contracts): dailies, sessions, completion and progress contracts (ENG-04)`.

### Task 6: The registry

**Files:** create `src/endpoints.ts`, `src/fixtures/index.ts`, `src/fixtures/problems.ts`, `tests/endpoints.test.ts`, `tests/fixtures.test.ts`, `tests/public-api.test.ts`; finish `src/index.ts`.

**Produces:** `endpoints` (an object of the twelve, so a caller keeps each one's types), `endpointList`, `sharedSchemas` (names for the schemas the document shares: `Problem`, `Question`, `PlayerQuestion`, `Answer`, `Grade`, `ScoringConfig`, `TimingConfig`, `QuestionTypeTunables`, `GameRules`, `Renderings`, `SessionQuestion`, `QuestionSet`, `Progress`, `SessionEvaluation`); `fixtures: readonly Fixture[]` where `Fixture = { name; schema; value; endpoint?: string; part?: 'params' | 'query' | 'body' | 'response' }`; one problem fixture per error code.

- [ ] Failing tests, then code:
  - `endpoints.test.ts`: "ids are unique, and so is each method and path"; "a path's `:names` are exactly the keys of its params schema"; "every endpoint declares an access level, and none is admin in v0"; "a GET has no body and no idempotency key"; "`sessions.complete` requires an Idempotency-Key"; "every listed error code is in the catalogue".
  - `fixtures.test.ts` (done-when): **"every fixture parses with its schema and comes back unchanged"**; "every endpoint has a fixture for each input it takes and for its response"; "every error code has a problem fixture"; "fixture names are unique".
  - `public-api.test.ts`: the export lists of `.`, `./fixtures` and `./openapi`.
- [ ] `pnpm verify`, commit `feat(contracts): the endpoint registry and its fixtures (ENG-04)`.

### Task 7: OpenAPI 3.1

**Files:** create `src/openapi.ts`, `tests/openapi.test.ts`, `tests/node/openapi-validity.test.ts`.

**Produces:** `generateOpenApi(options: { endpoints: readonly Endpoint[]; schemas: Record<string, z.ZodType>; info: { title: string; version: string; description?: string }; servers?: readonly { url: string; description?: string }[] }): OpenApiDocument`.

How it is built: a registry local to the call holds `schemas` plus each endpoint's body and success schema, named from the endpoint id (`SessionsCompleteRequest`, `SessionsCompleteResponse`) unless already shared. One `z.toJSONSchema(registry, { target: 'draft-2020-12', io: 'input', unrepresentable: 'throw', uri })` call gives `components.schemas`; `$schema` and `$id` are removed. Path and query parameters come from the params and query objects. `Idempotency-Key` is a required header where the endpoint says so; `If-None-Match`, `ETag` and a 304 appear where `caching` isn't `'none'`. Each error status is one response of `application/problem+json` naming its codes in `x-error-codes`; every operation gets `rate_limited` (with a `Retry-After` header) and `internal_error`, an operation with inputs gets `invalid_request`, a non-public one gets `unauthenticated`. `security` is empty for public and names `playerSession` or `adminSession` otherwise. `openapi` is `'3.1.2'`.

- [ ] Failing tests, then code:
  - `openapi.test.ts`: "every endpoint in the registry is an operation in the document"; "every `$ref` resolves"; "`:param` becomes `{param}` and is a required path parameter"; "an idempotent endpoint requires the Idempotency-Key header"; "every operation documents 429 with Retry-After"; "a public operation asks for no credentials and a player one for the player session"; "a schema that can't be represented throws" (a toy endpoint with a transform); "the document is plain JSON and the same on every run".
  - `tests/node/openapi-validity.test.ts` (done-when): **"the generated document is valid OpenAPI 3.1"** (`@seriousme/openapi-schema-validator`); "every component schema compiles as JSON Schema 2020-12" (`ajv`); "every fixture validates against its schema in the generated document".
- [ ] `pnpm verify`, commit `feat(contracts): generate OpenAPI 3.1 from the registry (ENG-04)`.

### Task 8: ADRs, the plan, review, pull request

**Files:** create `docs/plans/ENG-04.md` (this plan, marked approved), `docs/adr/0022-published-forms-travel-beside-the-blocks.md`, `docs/adr/0023-the-endpoint-registry-is-data-and-openapi-comes-from-zod.md`, `docs/adr/0024-what-a-snapshot-a-completion-and-a-guest-carry.md`.

- [ ] Write the three ADRs from the template, status `Proposed`: 0022 from D1 and D10; 0023 from the library check and D5; 0024 as a table of readings from D2, D3, D4, D6, D7, D8, with the offset's sign convention.
- [ ] Re-read the whole diff for names, dead code and anything that belongs in another package; run `security-review` on the branch (the completion and guest paths are write and auth contracts).
- [ ] `pnpm verify`; commit `docs: ENG-04 plan and ADRs 0022 to 0024 (ENG-04)`; push; open the pull request against `main`, stating that it is stacked on pull request 5; bind it and read CI.
- [ ] Report in the team guide's format.

---

## Proof map

| Done-when or ruling | Proven by |
|---|---|
| The registry generates OpenAPI 3.1 | `tests/node/openapi-validity.test.ts` › "the generated document is valid OpenAPI 3.1", "every component schema compiles as JSON Schema 2020-12"; `tests/openapi.test.ts` › "every endpoint in the registry is an operation in the document", "every `$ref` resolves" |
| Every fixture parses with its schema | `tests/fixtures.test.ts` › "every fixture parses with its schema and comes back unchanged", "every endpoint has a fixture for each input it takes and for its response"; `tests/node/openapi-validity.test.ts` › "every fixture validates against its schema in the generated document" |
| Snapshot carries multiplier, limit, locale, scoring config and tunables | `tests/questions.test.ts` › "a session question carries what the engine scores with"; `tests/sessions.test.ts` › "the engine's evaluation of the completion fixture against the set fixture equals the result fixture" |
| Completion carries tagged answer or `null`, whole `elapsedMs`, `timed`, engine version, zone id and offset | `tests/sessions.test.ts`, the five cases named in Task 5 |
| `/config` embeds the engine's three schemas | `tests/config.test.ts` |
| Player-facing questions refuse a key | `tests/questions.test.ts` › "a keyless item refuses a key, an explanation and sources" |
| Published forms have a schema, and an ADR says where | `tests/published.test.ts`; ADR 0022 |
| Game-rule values can't reach results as `NaN` | `tests/rules.test.ts` |
| §19.2 rules: pagination, idempotency key, server time, ETag, problem details, 429, UTC timestamps | `tests/content.test.ts`, `tests/endpoints.test.ts`, `tests/openapi.test.ts`, `tests/errors.test.ts`, `tests/primitives.test.ts` |
| Every route declares public, player or admin (§7) | `tests/endpoints.test.ts` › "every endpoint declares an access level" |

## Edge cases walked

- **Empty:** a quiz page with no items; no flags; a new player's progress; a question with no renderings.
- **Error:** one problem fixture per code; an unknown code still parses.
- **Offline and late:** a completion may be days older than its arrival; `serverOffsetMs` may be `null`.
- **Duplicate and retry:** the idempotency key is required and has a grammar; a guest request is its own idempotency.
- **Concurrent:** a contract can only require that two creates return one shape; BE-05 proves one row.
- **Time zone and DST:** offsets of +345, +765 and +840; a zone the server doesn't know still parses, and the offset is its fallback. The schema can't check that an offset belongs to a zone without `Intl`; that is a plausibility rule for BE-06.
- **Largest text, screen reader, Reduce Motion, devices:** not applicable, no user interface.

## What will stay unverified

- Type parity with `packages/game-rules` (D7), until it can be imported.
- Hermes: the schemas use nothing zod doesn't already use in `quiz-engine`, but no test here runs on a device.
- The identity shapes (D4) against Better Auth, which BE-03 tests first.

## Notes for neighbouring tickets (proposed, not built here)

1. **After pull request 3 merges:** a parity test that `z.infer<typeof gameRulesSchema>` and `GameRules` are assignable both ways, and the same for the three enums.
2. **`quiz-engine`:** export an `engineVersion` constant (D8), and a per-type `contentOf(question)` so a wire schema can require a rendering for every block in a payload without naming a type.
3. **BE-01:** serve `generateOpenApi({ endpoints: endpointList, schemas: sharedSchemas, info })`; on a 304 from `/config` the body's `serverTime` is absent, so send `Date`.
4. **BE-03:** confirm or replace D4; decide bearer or cookie.
5. **BE-04:** produce renderings; switch MathJax's `html` extension off; decide a spoken form for math (no requirement names one today).
6. **BE-06:** check an offset against its zone where the zone is known; set the body-size limit of ADR 0021.
7. **FE-05:** the client reads `endpoints`; the fake server starts from `@repo/contracts/fixtures`.

## Verification

`pnpm verify` from the repository root (typecheck of both tsconfigs, lint, format check, every package's tests). The two bold test names in Tasks 6 and 7 are the done-when line; the bold one in Task 5 shows a snapshot and a completion hold everything the engine needs.
