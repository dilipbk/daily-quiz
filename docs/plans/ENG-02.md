# ENG-02 `packages/quiz-engine` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ticket:** ENG-02 · **Status:** APPROVED by the PM on 2026-11-15, with the rulings below · **Owner:** fullstack engineer · **Size:** L, confirmed. It fixes the `{type, payload, key}` contract that `contracts`, the app, the API and the content tools build on, and it decides ranked scores.

**Goal:** One pure TypeScript package that validates, grades and scores the five MVP question types identically on the device and on the server, and that takes a sixth type without a change to its core.

**Architecture:** A question type is a module (`payload`, `key` and `response` schemas, a cross-field check, a pure grader). A registry built from a list of modules derives every schema and union; a type-agnostic core (`src/core`) dispatches grading and computes scores from a `Grade`, never from a type name. Text normalization is a small toolkit (`src/text`) used by `type_answer`. Shared fixtures are data plus a runner that needs no test framework, so Vitest, Jest and a device can all run them.

**Tech Stack:** TypeScript ~6.0 strict · zod `^4.6.7` (the range ENG-01 installed) · Vitest 5 from the root config (ADR 0002) · fast-check `^4.10.2` for property tests.

**Spec:** `docs/spec.md` §7.4 (QT-01 to QT-05), §10.1, §10.3, §10.5, §11.1–11.3, D13, §21.1 · `docs/roadmap.md` §3, §4.3, §7 and the ENG-02 row · `docs/adr/0002-vitest-for-shared-packages.md` · `docs/design/ds-01-brand-directions.md` line 47 (the worked score of 112).

---

## PM rulings (2026-11-15)

The plan is approved. Build it as written, with these rulings. Where a ruling and the text below disagree, the ruling wins.

1. **R1 is in scope.** The engine derives the Standard limit, and Task 4 stays. The server calls it once when it builds a session and stores the result in the snapshot.
2. **R3 stands.** The first correct answer earns no combo: the n-th consecutive correct answer earns `min(10 × (n − 1), 50)`. The owner is told in the report and may overturn it, so keep it to one function and one fixture.
3. **R2 and R4 to R11 stand as read.** Record all eleven readings in ADR 0021.
4. **ENG-01's real names.** `@repo/content-blocks` exports `blocksSchema` (a `z.array` that already requires at least one block), `imageBlockSchema` (alt text required), and the types `Block` and `ImageBlock`. Use `blocksSchema` and `Block[]` where this plan says `contentBlocksSchema` and `ContentBlocks`. Assumptions A2, A4 and A5 hold as written.
5. **Branch.** `feat/ENG-02-quiz-engine` is stacked on `feat/ENG-01-content-blocks` (pull request 4). That replaces the note about branching from `main` after ENG-01 merges.
6. **RegExp syntax.** Keep the constraint as written: explicit ranges fit R9. Its stated reason is out of date. Hermes' `doc/RegExp.md` lists Unicode property escapes and lookbehind as supported, and `content-blocks` uses `\p{…}`. The proof on a device belongs to the FND-05 smoke build.
7. **ADR numbers.** 0020 for question types as registry modules, 0021 for the grading and scoring readings. Numbers 0003 to 0010 are taken by other tickets (0009 and 0010 went to another ticket after this plan was approved).
8. **Shared config, first step of Task 1, in its own commit.** Move `allowImportingTsExtensions` into `packages/config/tsconfig/base.json` and remove it from `packages/content-blocks/tsconfig.json`. Pin zod once in a pnpm catalog and point both packages at it.
9. **Review.** After Task 10, a fresh reviewer and `security-review` read the whole branch before the report, as the plan recommends.

---

## Needs grilling

**None.** I found no place where the spec contradicts itself on this ticket, and no fork that needs the owner in a session.

The spec is loose in eleven places. Each has one reading that the text or the design docs support, listed below with its evidence. Every one is isolated to a config value or a single function, so overturning it at approval costs a line of this plan, not a redesign. **R1 is a scope ruling and R3 changes every score by ten points: please rule on those two explicitly.**

| #   | Loose point                                                                                                   | Reading this plan uses                                                                                                                                                                                                     | Evidence                                                                                                                                               | Task |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| R1  | Who derives the Standard limit of §10.3 (20 s, 30 s, +10 s)? §10.5 needs it; the ticket doesn't cite §10.3.   | The engine does: each type module declares a time class and `standardLimitMs()` turns it into milliseconds. The server calls it once when it builds a session and stores the result.                                       | A per-type table in FE-03 or the API would make a sixth type touch the session engine, which QT-01 forbids. Dropping Task 4 removes it cleanly.        | 4    |
| R2  | "The multiplier ranges from 0.8 to 1.5 and comes from the question's rating": no curve is given.              | Clamped linear between two tunable anchors: rating 1200 gives 0.8, rating 1800 gives 1.5. The server freezes the multiplier into the session snapshot; scoring takes the number, not the rating.                           | §11.5 seeds easy at 1200 and hard at 1800; DS-01 shows an easy answer at "80 base". Ratings drift, so a challenge's two players need one frozen value. | 3    |
| R3  | "Combo: +10 for each consecutive correct answer, capped at +50": does the first correct answer earn +10 or 0? | 0. The n-th consecutive correct answer earns `min(10 × (n − 1), 50)`.                                                                                                                                                      | DS-01: "112 points after one correct easy answer: 80 base plus a 40% speed bonus" leaves no room for a combo.                                          | 3    |
| R4  | Rounding is unspecified.                                                                                      | Points are integers. Base and speed bonus are each rounded half up; the speed bonus is a share of the rounded base; the combo is flat (difficulty and speed don't multiply it).                                            | The top bar shows whole points (§9.2). One rule on both sides is what matters.                                                                         | 3    |
| R5  | Is `ordering` all-or-nothing?                                                                                 | Yes. Any order but the key's is incorrect with no credit.                                                                                                                                                                  | §7.4 says "points scale" only for `slider_estimate` and `map_pin`; §10.5 pays "for a correct answer". `Grade.credit` exists so V1 types can scale.     | 6    |
| R6  | "Typo tolerance scaled to answer length _(tunable)_": no metric or thresholds.                                | On by default: 0 edits up to 4 characters, 1 edit for 5–8, 2 edits from 9, counting an adjacent swap as one edit. Never across digits. An author can lower it per question (`maxTypos`) and list near-misses (`rejected`). | Product principle 3: "a wrong fact costs more than a missing quiz". Setting `typoThresholds` to `[]` is the kill switch.                               | 8    |
| R7  | Number formats: "1,000", "1.000", "3,14".                                                                     | Parsing never reads a locale. A lone separator followed by exactly three digits has two readings; the answer is correct if either is within tolerance.                                                                     | A German-locale device shows a comma on the decimal pad while playing English content. The engine may not read the device's locale.                    | 7    |
| R8  | "Leading articles (locale-aware)": whose locale?                                                              | The question's content language (§11.1 `locale`), passed in. The MVP ships English only: the, a, an. Elided articles (l', d') wait for the V1 languages.                                                                   | L10N-04 separates content language from UI language; L10N-11 launches in English.                                                                      | 7    |
| R9  | "Diacritics": which scripts?                                                                                  | Combining marks used with Latin, Greek and Cyrillic are removed, and nine letters fold (ø→o, ł→l, æ→ae and so on). Marks that carry meaning in other scripts (Devanagari vowel signs, Arabic harakat) are kept.            | Removing every mark would make different Hindi words equal. L10N-08 puts those scripts in V1.                                                          | 7    |
| R10 | Untimed and Relaxed.                                                                                          | Scoring takes `timed: false` and pays no speed bonus. It has no input at all for the ×1.5 or ×2 setting.                                                                                                                   | §10.3: "Untimed disables the speed bonus only"; D13.                                                                                                   | 3    |
| R11 | A typed answer that is empty.                                                                                 | `null` (timeout) is `unanswered`. Submitted text that is empty after normalization is `incorrect`.                                                                                                                         | §10.2: `TIMEOUT` locks with no answer. Both score 0.                                                                                                   | 8    |

---

## Boundaries

| Concern                                                                                                          | Owner         | Where the line sits                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payload`, `key` and `response` schemas per type; the registry; graders; normalization; scoring; shared fixtures | **ENG-02**    | Everything in this plan.                                                                                                                                                       |
| The rest of the Question entity (§11.1): id, version, prompt, explanation, sources, rating, locale               | ENG-04, BE-04 | The engine's question is the triple `{type, payload, key}` only. Locale, multiplier and Standard limit reach it as arguments.                                                  |
| Block shapes inside options                                                                                      | ENG-01        | One file, `src/types/content.ts`, imports `@repo/content-blocks`.                                                                                                              |
| Renderers, accessibility behaviour, editor forms (the other half of a QT-01 "registry module")                   | FE-04, CMS-01 | The app keeps its own map keyed by the engine's `QuestionType` and typed `satisfies Record<QuestionType, …>`, so a missing renderer fails the build.                           |
| State machine, timers, measuring `elapsedMs`, pauses, persistence, shuffling what is shown                       | FE-03         | The engine receives `elapsedMs` and `standardLimitMs` as numbers. It never sees a clock.                                                                                       |
| Streaks, XP, levels, daily goal                                                                                  | ENG-03        | `SessionScore.correctCount` and `questionCount` are what `game-rules` needs for XP-01. Points and XP stay separate (§10.5).                                                    |
| Endpoints, the completion payload, plausibility checks                                                           | ENG-04, BE-06 | The engine exports schemas to embed and `evaluateSession()` to call.                                                                                                           |
| Content validation commands                                                                                      | CT-02         | Structural rules (duplicate options, a key that names no option) are in the engine's question schema, so every consumer gets them. Editorial rules stay in `content:validate`. |

**Places the spec leaves the line unclear**

1. **The Standard limit (R1).** §10.5 scores against it and §10.3 defines it, but no ticket owns deriving it. §11.1 also gives a quiz its own "time per question"; I read that as replacing the default, decided by the server at session build.
2. **What a session snapshot must carry.** Roadmap §4.3 re-grades "against the session's immutable question snapshot", and roadmap §7 says a running session keeps the config it started with. For the re-grade to match the device, the snapshot needs each question's `difficultyMultiplier`, `standardLimitMs` and `locale`, plus the scoring config and type tunables the session started with (or their version). That is ENG-04's schema; it is listed under "Notes for neighbouring tickets" so it isn't lost.
3. **An answer after the player's own deadline.** The engine knows only the Standard limit, and under D13 a late answer earns base points and no bonus whatever the setting. Whether an answer at 3× the limit is believable is a plausibility rule (BE-06).
4. **Analytics payload per type (QT-01).** §20 defines only common properties (`type`, `correct`, `time_ms`). `Grade.status` supplies `correct`; nothing per type is built here.
5. **`true_false` labels.** The payload is empty and the two labels are app strings (L10N-01). A question that needs other labels ("Fact" and "Myth") is a two-option `single_choice`.

---

## Assumptions about ENG-01 (confirm before Task 5)

ENG-01 is unmerged; its worktree today exports only `isHttpsUrl`. All five assumptions are confined to `src/types/content.ts` and `src/fixtures/content.ts`.

| #   | Assumption                                                                                                           | If it is wrong                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A1  | `import { contentBlocksSchema, type ContentBlocks } from '@repo/content-blocks'`: a zod schema for a list of blocks. | Rename in the one file.                                                                                     |
| A2  | It is a `z.array(...)`, so `.min(1)` applies.                                                                        | Use `.refine((blocks) => blocks.length > 0)`.                                                               |
| A3  | `import { imageBlockSchema, type ImageBlock } from '@repo/content-blocks'`, and it requires alt text (A11Y-10).      | Refine `contentBlocksSchema` to exactly one block whose discriminator is `image`.                           |
| A4  | Parsed blocks are plain JSON values, so two options can be compared structurally.                                    | Compare the unparsed input instead.                                                                         |
| A5  | zod is `^4.6.7` and relative imports carry `.ts` (`allowImportingTsExtensions`), as in ENG-01's worktree.            | Copy whatever range and convention ENG-01 merges; `tests/node/boundaries.test.ts` asserts the ranges match. |

`pnpm-lock.yaml` will conflict with ENG-01's branch. ENG-02 depends on ENG-01, so it branches from `main` after ENG-01 merges.

---

## Global Constraints

- `src/` imports only `zod` and `@repo/content-blocks`. Nothing from React Native, `node:*` or the network. The base tsconfig loads no Node or DOM types, so `process`, `console`, `fetch` and `setTimeout` don't compile there.
- `src/` reads nothing from the environment: no `Date`, `Math.random`, `Intl`, `performance`, `toLocaleLowerCase`, `toLocaleUpperCase`, `toLocaleString` or `localeCompare`. Lint enforces it (Task 1).
- `src/` keeps to syntax every target engine runs: no RegExp Unicode property escapes (`\p{…}`), no lookbehind, no named groups. Hermes' feature list doesn't name them as supported (checked 2026-11-15). `String.prototype.normalize` is ES2015 and is used.
- No module-level mutable state: no `let` at the top of a file, no cache.
- Every tunable is an argument. The spec's values exist once, as exported data (`specScoringConfig`, `specTimingConfig`, `specTypeAnswerTunables`), and no function falls back to them.
- Points are integers. A grade's `credit` is a number from 0 to 1.
- Hard input caps, as constants (they bound work on the completion endpoint and are not tunables): response text ≤ 256 UTF-16 units; an accepted or rejected entry ≤ 120; at most 20 accepted and 20 rejected entries; ids 1–32 characters.
- Tests are `*.test.ts` under `packages/quiz-engine/tests/`, mirroring `src/` (ENG-01's layout). They import `describe`, `it`, `expect` from `vitest`.
- Property tests call `fc.assert(fc.property(…))` inside `it`. fast-check's default string is printable ASCII: text properties must pass `{ unit: 'grapheme' }` or `{ unit: 'binary' }`.
- A fast-check counterexample is fixed in the same commit that adds it as a shared fixture or a named case.
- Branch `feat/ENG-02-quiz-engine`; conventional commits ending `(ENG-02)`; `pnpm verify` green before every commit.

**Library check (roadmap §3, "versions move fast"), 2026-11-15.** fast-check 4.10.2 (published 2026-09-19) and zod 4.6.7 are the registry's `latest`; fast-check.dev and zod.dev describe the APIs used here. Spec §21.1 and ADR 0002 already name fast-check, so no new ADR is needed for it. **Recommendation: use `fast-check` directly, not the `@fast-check/vitest` connector** (0.5.0, supports Vitest 5). The connector is still 0.x, adds a second dependency, and ties properties to one runner; the fast-check docs say it "works with any test runner out of the box". Re-check both sites on the day of install.

## Review Focus

The five inputs the spec implies and doesn't describe, most likely first. Each is pinned by a test in the task that owns the code.

1. **A near-miss that is another real answer** ("Austria" for "Australia", "Iraq" for "Iran", "Apollo 12" for "Apollo 11"): must be incorrect, not forgiven as a typo. Task 8, fixtures `type_answer/rejected-near-miss`, `type_answer/tie-with-rejected`, `type_answer/short-answer-no-typos`, `type_answer/digits-differ`.
2. **A decimal comma or a grouped thousand** from a device whose locale isn't the content's ("3,14", "1.000"): must be read as the player meant. Task 7 `parseNumberReadings` cases; Task 8 fixtures `type_answer/decimal-comma`, `type_answer/grouping-dot`.
3. **An oversized or hostile answer** (10,000 characters, 300 option ids): must be `invalid` before any edit distance is computed. Task 8 fixture `type_answer/over-length`; Task 7 `editDistance stops once the distance exceeds max`.
4. **A question type this build doesn't know** (the server is ahead of the app): a grade of `invalid`, reason `unknown_type`, and no throw. Task 2.
5. **Garbage tunables from remote config** (a negative combo step, `minRating` above `maxRating`, a limit of 0): the config schema refuses them, and scoring never returns `NaN`. Task 3.

---

## File structure

```
packages/quiz-engine/
  package.json              modify: dependencies, "./fixtures" export, typecheck script
  tsconfig.json             modify: include tests, exclude tests/node
  src/
    index.ts                public API: re-exports only
    core/                   type-agnostic. Names no type id; imports nothing from types/, text/, fixtures/
      module.ts             QuestionTypeModule, defineQuestionType, Grade and its constructors
      registry.ts           createRegistry, Registry, derived unions
      grading.ts            gradeAnswer, toPlayerQuestion
      scoring.ts            scoring config, difficultyMultiplier, scoreAnswer, scoreSession
      timing.ts             timing config, standardLimitMs                         (R1)
      session.ts            evaluateSession
      conformance.ts        fixture types, runGradingFixtures, runScoringFixtures
      equal.ts              deepEqual for plain JSON values
    text/                   used by type modules, never by core
      normalize.ts          normalizeAnswerText
      edit-distance.ts      editDistance
      number.ts             parseNumberReadings
    types/                  one module per type, and the catalogue
      content.ts            the only file that imports @repo/content-blocks
      choice.ts             option schema, option checks, gradeChoice
      single-choice.ts  image-choice.ts  true-false.ts  ordering.ts  type-answer.ts
      index.ts              mvpQuestionTypes, mvpRegistry, specMvpTunables, derived types
    fixtures/               shared fixtures: data only. Exported as @repo/quiz-engine/fixtures
      content.ts            text() and image() block builders
      single-choice.ts  image-choice.ts  true-false.ts  ordering.ts  type-answer.ts  scoring.ts
      index.ts              gradingFixtures, scoringFixtures, runSharedFixtures
  tests/
    support/                toy-types.ts, multi-select.ts, arbitraries.ts, registry-properties.ts
    core/  text/  types/    unit and property tests mirroring src/
    fixtures.test.ts  purity.test.ts  sixth-type.test.ts  public-api.test.ts
    node/                   tsconfig.json (Node types), boundaries.test.ts: the only test that reads files
eslint.config.js            modify: purity and import-direction rules for packages/quiz-engine/src
docs/adr/NNNN-question-types-as-registry-modules.md        create
docs/adr/NNNN-grading-and-scoring-readings.md              create (records R1–R11 as ruled)
docs/traceability.md        modify: QT-02 and QT-03 to built
```

**What a sixth type touches:** a new `src/types/<type>.ts`, one entry in the `mvpQuestionTypes` list, a new `src/fixtures/<type>.ts` and one entry in the fixture list, and its own tests. Nothing in `src/core`, `src/text` or `src/index.ts`.

---

## Public API

Exported from `@repo/quiz-engine` unless marked. Signatures are the contract; bodies are the implementer's.

**`core/module.ts`**

```ts
export type GradeStatus = 'correct' | 'incorrect' | 'unanswered' | 'invalid';
export type InvalidReason = 'unknown_type' | 'type_mismatch' | 'malformed';
export interface Grade {
  readonly status: GradeStatus;
  readonly credit: number; // correct: 1 · incorrect: 0 ≤ credit < 1 · unanswered, invalid: 0
  readonly reason?: InvalidReason; // present only when status is 'invalid'
}
export function correct(): Grade;
export function incorrect(credit?: number): Grade; // default 0
export function unanswered(): Grade;
export function invalid(reason: InvalidReason): Grade;
export const gradeSchema: z.ZodType<Grade>; // strict, and enforces the credit rules above

export type TimeClass = 'choice' | 'constructed'; // §10.3: 20 s and 30 s
export interface QuestionIssue {
  readonly path: readonly (string | number)[]; // relative to the question, e.g. ['key', 'correctOptionId']
  readonly message: string;
}
export interface QuestionTypeModule<
  TType extends string,
  TPayload,
  TKey,
  TResponse,
  TTunables = undefined,
> {
  readonly type: TType;
  readonly timeClass: TimeClass;
  readonly payloadSchema: z.ZodType<TPayload>; // safe to send to a player
  readonly keySchema: z.ZodType<TKey>; // the answer
  readonly responseSchema: z.ZodType<TResponse>; // what a player submits
  readonly tunablesSchema?: z.ZodType<TTunables>;
  /** Cross-field rules a per-field schema can't state. Empty when the question is sound. */
  readonly check?: (question: {
    readonly payload: TPayload;
    readonly key: TKey;
  }) => readonly QuestionIssue[];
  /** Pure. Total over every question the registry's schema accepts and every parsed response. */
  readonly grade: (
    question: { readonly payload: TPayload; readonly key: TKey },
    response: TResponse,
    context: { readonly locale: string; readonly tunables: TTunables },
  ) => Grade;
}
export function defineQuestionType<
  TType extends string,
  TPayload,
  TKey,
  TResponse,
  TTunables = undefined,
>(
  module: QuestionTypeModule<TType, TPayload, TKey, TResponse, TTunables>,
): QuestionTypeModule<TType, TPayload, TKey, TResponse, TTunables>;
```

**`core/registry.ts`**

```ts
export type AnyQuestionTypeModule = QuestionTypeModule<string, any, any, any, any>;
export type QuestionOf<M> = /* union over M of */ { type; payload; key };
export type PlayerQuestionOf<M> = /* union over M of */ { type; payload };
export type AnswerOf<M> = /* union over M of */ { type; response };
export type TunablesOf<M> = {/* [type]: tunables, for each module that declares tunablesSchema */};

export interface Registry<M extends readonly AnyQuestionTypeModule[]> {
  readonly types: readonly M[number]['type'][];
  readonly questionSchema: z.ZodType<QuestionOf<M>>; // strict; runs each module's check
  readonly playerQuestionSchema: z.ZodType<PlayerQuestionOf<M>>; // strict: an object with `key` fails
  readonly answerSchema: z.ZodType<AnswerOf<M>>; // strict {type, response}
  readonly tunablesSchema: z.ZodType<TunablesOf<M>>;
  readonly get: (type: string) => M[number] | undefined;
}
/** Throws when the list is empty or two modules share a type id (a programming error, at start-up). */
export function createRegistry<const M extends readonly AnyQuestionTypeModule[]>(
  modules: M,
): Registry<M>;
```

**`core/grading.ts`**

```ts
export interface GradeContext<M extends readonly AnyQuestionTypeModule[]> {
  readonly locale: string; // the question's content language, BCP 47; only the primary subtag is read
  readonly tunables: TunablesOf<M>;
}
/** Never throws for a question the registry's schema accepts. `answer` is untrusted. */
export function gradeAnswer<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  question: { readonly type: string; readonly payload: unknown; readonly key: unknown },
  answer: unknown,
  context: GradeContext<M>,
): Grade;
export function toPlayerQuestion<Q extends { type: string; payload: unknown; key: unknown }>(
  question: Q,
): Omit<Q, 'key'>;
```

**`core/scoring.ts`**

```ts
export interface ScoringConfig {
  readonly basePoints: number; // 100
  readonly difficulty: {
    readonly minRating: number; // 1200
    readonly maxRating: number; // 1800
    readonly minMultiplier: number; // 0.8
    readonly maxMultiplier: number; // 1.5
  };
  readonly speedBonusMaxRatio: number; // 0.5
  readonly comboStep: number; // 10
  readonly comboCap: number; // 50
}
export const scoringConfigSchema: z.ZodType<ScoringConfig>; // strict
export const specScoringConfig: ScoringConfig; // the §10.5 values above, as data

export function difficultyMultiplier(rating: number, config: ScoringConfig['difficulty']): number;

export type ScoreTiming =
  | { readonly timed: false }
  | { readonly timed: true; readonly elapsedMs: number; readonly standardLimitMs: number };
export interface ScoreInput {
  readonly grade: Grade;
  readonly difficultyMultiplier: number;
  readonly timing: ScoreTiming;
}
export const scoreInputSchema: z.ZodType<ScoreInput>; // strict: no field for the A11Y-08 setting
export interface AnswerScore {
  readonly base: number;
  readonly speedBonus: number;
  readonly combo: number;
  readonly total: number;
  readonly streak: number; // consecutive correct answers including this one
}
export function scoreAnswer(
  input: ScoreInput,
  streakBefore: number,
  config: ScoringConfig,
): AnswerScore;
export interface SessionScore {
  readonly answers: readonly AnswerScore[];
  readonly totalPoints: number;
  readonly correctCount: number;
  readonly questionCount: number;
}
export function scoreSession(inputs: readonly ScoreInput[], config: ScoringConfig): SessionScore;
```

The arithmetic `scoreAnswer` implements (R2–R4, R10), with `clamp01(x) = min(1, max(0, x))`:

```
base       = round(basePoints × difficultyMultiplier × grade.credit)
remaining  = timed and standardLimitMs > 0 ? clamp01((standardLimitMs − elapsedMs) / standardLimitMs) : 0
speedBonus = round(base × speedBonusMaxRatio × remaining)
streak     = grade.status is 'correct' ? streakBefore + 1 : 0
combo      = grade.status is 'correct' ? min(comboStep × (streak − 1), comboCap) : 0
total      = base + speedBonus + combo
```

`difficultyMultiplier` is `minMultiplier + (maxMultiplier − minMultiplier) × clamp01((rating − minRating) / (maxRating − minRating))`.

**`core/timing.ts`** (R1) and **`core/session.ts`**

```ts
export interface TimingConfig {
  readonly choiceMs: number; // 20_000
  readonly constructedMs: number; // 30_000
  readonly mediaBonusMs: number; // 10_000
}
export const timingConfigSchema: z.ZodType<TimingConfig>;
export const specTimingConfig: TimingConfig;
export function standardLimitMs(
  timeClass: TimeClass,
  hasMediaOrMath: boolean,
  config: TimingConfig,
): number;

export interface SessionItem {
  readonly question: { readonly type: string; readonly payload: unknown; readonly key: unknown };
  readonly answer: unknown;
  readonly locale: string;
  readonly difficultyMultiplier: number;
  readonly timing: ScoreTiming;
}
export interface SessionEvaluation {
  readonly grades: readonly Grade[];
  readonly score: SessionScore;
}
/** The one call the app makes at `finishing` and the API makes to re-grade (roadmap §4.3). */
export function evaluateSession<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  items: readonly SessionItem[],
  tunables: TunablesOf<M>,
  scoring: ScoringConfig,
): SessionEvaluation;
```

**`core/conformance.ts`**

```ts
export interface GradingFixture {
  readonly id: string; // '<type>/<case>'
  readonly cites: readonly string[]; // requirement ids
  readonly question: { readonly type: string; readonly payload: unknown; readonly key: unknown };
  readonly locale: string;
  readonly answer: unknown;
  readonly tunables?: unknown; // replaces the tunables passed to the runner, for this fixture
  readonly expected: Grade;
}
export interface ScoringFixture {
  readonly id: string;
  readonly cites: readonly string[];
  readonly config: ScoringConfig;
  readonly inputs: readonly ScoreInput[];
  readonly expected: SessionScore;
}
export interface FixtureReport {
  readonly ran: number;
  readonly failures: readonly {
    readonly id: string;
    readonly expected: unknown;
    readonly actual: unknown;
  }[];
}
export function runGradingFixtures<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  fixtures: readonly GradingFixture[],
  tunables: TunablesOf<M>,
): FixtureReport;
export function runScoringFixtures(fixtures: readonly ScoringFixture[]): FixtureReport;
```

**`text/normalize.ts`** and **`types/type-answer.ts`**

```ts
export interface TypeAnswerTunables {
  readonly articles: Readonly<Record<string, readonly string[]>>; // primary language subtag → articles
  readonly typoThresholds: readonly { readonly minLength: number; readonly maxEdits: number }[]; // ascending
}
export const typeAnswerTunablesSchema: z.ZodType<TypeAnswerTunables>;
export const specTypeAnswerTunables: TypeAnswerTunables;
// { articles: { en: ['the', 'a', 'an'] }, typoThresholds: [{ minLength: 5, maxEdits: 1 }, { minLength: 9, maxEdits: 2 }] }
export function normalizeAnswerText(
  text: string,
  locale: string,
  articles: TypeAnswerTunables['articles'],
): string;
```

Not exported from the package: `editDistance(a: string, b: string, max: number): number` and `parseNumberReadings(text: string): readonly number[]`.

**`types/index.ts`**

```ts
export const mvpQuestionTypes: readonly [
  /* single_choice, true_false, image_choice, type_answer, ordering */
];
export const mvpRegistry: Registry<typeof mvpQuestionTypes>;
export type QuestionType = (typeof mvpQuestionTypes)[number]['type'];
export type Question = QuestionOf<typeof mvpQuestionTypes>;
export type PlayerQuestion = PlayerQuestionOf<typeof mvpQuestionTypes>;
export type Answer = AnswerOf<typeof mvpQuestionTypes>;
export type MvpTunables = TunablesOf<typeof mvpQuestionTypes>; // { type_answer: TypeAnswerTunables }
export const specMvpTunables: MvpTunables;
```

**`@repo/quiz-engine/fixtures`**

```ts
export const gradingFixtures: readonly GradingFixture[];
export const scoringFixtures: readonly ScoringFixture[];
/** Runs every shared fixture against mvpRegistry with the spec values. Needs no test runner. */
export function runSharedFixtures(): FixtureReport;
```

**The five types**

| Type            | Time class    | `payload` (player-safe)                             | `key`                                                                                                                                                    | `response`           | Checks beyond field shapes                                                                                                                                                 |
| --------------- | ------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `single_choice` | `choice`      | `{ options }`: 2–4 of `{ id, content: blocks ≥ 1 }` | `{ correctOptionId }`                                                                                                                                    | `{ optionId }`       | ids unique; the key names an option; no two options with equal content                                                                                                     |
| `true_false`    | `choice`      | `{}`                                                | `{ value: boolean }`                                                                                                                                     | `{ value: boolean }` | none                                                                                                                                                                       |
| `image_choice`  | `choice`      | `{ options }`: 2–4 of `{ id, image }`               | `{ correctOptionId }`                                                                                                                                    | `{ optionId }`       | as `single_choice`, comparing images                                                                                                                                       |
| `type_answer`   | `constructed` | `{ format }`: `'text'` or `'number'`                | `{ accepted, rejected?, maxTypos?, numeric? }`; `accepted[0]` is the answer shown on reveal; `numeric` is `{ value, tolerance ≥ 0, units? }`, all finite | `{ text }` ≤ 256     | `format` is `'number'` exactly when `numeric` is present; every accepted entry normalizes to something; no entry is both accepted and rejected (compared without articles) |
| `ordering`      | `constructed` | `{ items }`: 3–6 of `{ id, content: blocks ≥ 1 }`   | `{ order }`: ids                                                                                                                                         | `{ order }`: ids     | ids unique; `key.order` is a permutation of the ids; `payload.items` is not already in key order; no two items with equal content                                          |

Every object schema is strict. `payload.items` order is the authored order and must not reveal the key.

---

## Proof map

| What must be proven                                        | Named test or check                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QT-01** (engine side): a type is a module in a registry  | `tests/core/registry.test.ts › QT-01: builds question, player-question and answer schemas from the modules alone` · `tests/types/catalogue.test.ts › QT-01: the five MVP types are registered`                                                                                                                                                                                    |
| **QT-02**: graders are deterministic                       | `tests/grading.properties.test.ts › QT-02: grading the same question and answer twice gives deep-equal grades`                                                                                                                                                                                                                                                                    |
| **QT-02**: shared fixtures the app and the server both run | `tests/fixtures.test.ts › QT-02: every shared fixture passes` (it asserts `runSharedFixtures().failures` is empty) · `tests/node/boundaries.test.ts › the fixtures entry point imports no test runner`. FE-03 and BE-06 each add the same one-line assertion in their own runner (see "Done-when evidence").                                                                      |
| **QT-03**, clause by clause                                | `tests/text/normalize.test.ts › QT-03 case` · `› QT-03 diacritics` · `› QT-03 whitespace` · `› QT-03 punctuation` · `› QT-03 leading articles follow the question's locale` · `tests/types/type-answer.test.ts › QT-03 accepted aliases` · `› QT-03 numeric tolerance` · `› QT-03 typo tolerance scales with answer length` · `› QT-03 typo thresholds are tunable`               |
| **§10.5** scoring                                          | `tests/core/scoring.test.ts › §10.5 base points are 100 × the difficulty multiplier` · `› §10.5 speed bonus is up to +50% of base, proportional to time left on the Standard limit` · `› §10.5 combo adds 10 per consecutive correct answer after the first, capped at 50` · `› §10.5 every value comes from the config passed in` · shared fixture `scoring/ds-01-example` (112) |
| **D13**                                                    | `tests/core/scoring.test.ts › D13: an answer after the Standard limit keeps its base points and earns no speed bonus` · `› D13: scoring has no input for the player's time setting` · `tests/core/scoring.properties.test.ts › D13: Standard, ×1.5 and ×2 players with the same answers and times score the same`                                                                 |
| **Graders are pure**                                       | Lint: the purity block in `eslint.config.js` fails `pnpm verify` · `tests/purity.test.ts › graders are pure: the shared fixtures pass with the clock, randomness and locale APIs booby-trapped` · `tests/grading.properties.test.ts › graders are pure: deep-frozen inputs are not mutated`                                                                                       |
| **Property-tested against shared fixtures**                | `tests/grading.properties.test.ts` draws its questions from `gradingFixtures` and from generated questions, and runs every generic property on both · `tests/fixtures.test.ts › every registered type has a fixture for correct, incorrect, unanswered and invalid`                                                                                                               |
| **A sixth type would touch no engine code**                | `tests/sixth-type.test.ts › a sixth type validates, grades, scores and passes the generic properties with src/core unchanged` · `tests/node/boundaries.test.ts › src/core names no question type and imports nothing from types, text or fixtures`                                                                                                                                |

---

## Edge cases walked

| Case                                                                                                                                                 | Behaviour                                                                                                                                      | Pinned in  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Answer is `null` or `undefined` (timeout)                                                                                                            | `unanswered`; 0 points; the streak resets                                                                                                      | Tasks 2, 3 |
| Answer is not an object, lacks `type` or `response`, has extra keys                                                                                  | `invalid`, `malformed`                                                                                                                         | Task 2     |
| Answer for another type                                                                                                                              | `invalid`, `type_mismatch`                                                                                                                     | Task 2     |
| Question of a type the registry doesn't hold                                                                                                         | `invalid`, `unknown_type`; no throw                                                                                                            | Task 2     |
| Option id that isn't in the payload                                                                                                                  | `invalid`, `malformed`                                                                                                                         | Task 5     |
| Duplicate option ids, two options with the same content, a key that names no option                                                                  | The question fails `questionSchema`, with the issue's path                                                                                     | Task 5     |
| Typed text that is empty, spaces only, or punctuation only                                                                                           | `incorrect`. The schema refuses an accepted entry that normalizes to nothing, and the grader never matches an empty string.                    | Task 8     |
| Typed text over 256 units                                                                                                                            | `invalid`, `malformed`, before any distance is computed                                                                                        | Task 8     |
| NFC and NFD forms, full-width letters, ligatures, zero-width characters, soft hyphens                                                                | Equal after normalization                                                                                                                      | Task 7     |
| Diacritics: "París", "Malmo" for "Malmö", "Lodz" for "Łódź"                                                                                          | Correct                                                                                                                                        | Tasks 7, 8 |
| Case folding without a locale: "STRASSE" and "Straße", "İstanbul", final sigma                                                                       | Equal. The fold is lower, upper, lower with no locale argument.                                                                                | Task 7     |
| Marks that carry meaning (Devanagari vowel signs)                                                                                                    | Kept: two Hindi words that differ by a vowel sign stay different                                                                               | Task 7     |
| Leading article: "Beatles" for "The Beatles"                                                                                                         | Correct under `en`. The same strings under `es` with no `es` table: incorrect. "La Paz" under `es` with an `es` table: "Paz" correct.          | Tasks 7, 8 |
| An answer that is only an article ("A"), a word that starts like one ("Theatre")                                                                     | Untouched: an article is dropped only when followed by a space and more text                                                                   | Task 7     |
| Punctuation: "St. John's", "Jean-Paul", "AC/DC"; symbols: "C++"                                                                                      | Dots and apostrophes are dropped; hyphens and slashes become spaces; `+ # & % $ @ * =` are kept, so "C" is not "C++"                           | Tasks 7, 8 |
| Number formats for a key of 1000: "1000", "1,000", "1.000", "1 000", "1000.0", "+1000"                                                               | All correct. "1001" and "one thousand" are incorrect (an author may add the words as an alias).                                                | Tasks 7, 8 |
| Decimal comma: "3,14" for 3.14 ± 0.01                                                                                                                | Correct                                                                                                                                        | Tasks 7, 8 |
| A dropped separator: "314" for 3.14                                                                                                                  | Incorrect. Normalization keeps a dot or comma between two digits, and on a numeric key a typed number is judged as a number, never as text.    | Tasks 7, 8 |
| Tolerance boundary: "0.4" for 0.3 ± 0.1; "3.15" for 3.14 ± 0.01                                                                                      | Correct: the bound is inclusive, with a guard of `1e-9 × max(1, value)` against binary rounding. "0.41" and "3.16" are incorrect.              | Task 8     |
| Units: "71%" and "70 percent" for 71 ± 1 with `units: ['%', 'percent']`; "71 km"                                                                     | Correct, correct; "71 km" is incorrect because km isn't listed                                                                                 | Task 8     |
| Not numbers: "1e3", "1/2", "0x10", "five", "NaN", "Infinity", U+2212 minus                                                                           | The first six have no numeric reading and fall to text matching; "−5" reads as −5                                                              | Task 7     |
| Typos: "Missisipi" for "Mississippi"; "Parsi" for "Paris"                                                                                            | Correct (2 edits at 11 characters; one swap at 5)                                                                                              | Task 8     |
| Near-misses: "Iraq" for "Iran"; "Apollo 12" for "Apollo 11"; "Austria" for "Australia" with `rejected: ['Austria']`; "Austrlia" (one edit from both) | All incorrect: short answers get no edits, digits must match, and a typo must be strictly closer to an accepted entry than to any rejected one | Task 8     |
| Ordering, partly right (2 of 4 in place), reversed, or submitted untouched                                                                           | `incorrect`, credit 0                                                                                                                          | Task 6     |
| Ordering with a missing, extra, repeated or unknown id                                                                                               | `invalid`, `malformed`                                                                                                                         | Task 6     |
| Ordering whose stored item order equals the key, or with two equal items                                                                             | The question fails `questionSchema`                                                                                                            | Task 6     |
| Time at the limit, one millisecond inside it, and beyond it                                                                                          | Bonus 0 at and beyond the limit; never negative. Base points are kept.                                                                         | Task 3     |
| Extended time (D13): a ×2 player answers at 30 s on a 20 s Standard limit                                                                            | Base points only: the same as a Standard player at exactly 20 s                                                                                | Task 3     |
| Time values that can't be real: negative, fractional, `NaN`, a limit of 0                                                                            | `scoreInputSchema` refuses them; `scoreAnswer` still clamps, so a caller that skipped the schema gets no bonus above the cap and no `NaN`      | Task 3     |
| Untimed                                                                                                                                              | `timed: false`: no speed bonus; base and combo as usual                                                                                        | Task 3     |
| Duplicate and retry: the same completion evaluated twice                                                                                             | Deep-equal results                                                                                                                             | Task 10    |
| Concurrent: two sessions graded interleaved                                                                                                          | The same results as one after the other: there is no module state                                                                              | Task 10    |
| Time zone, DST, device locale                                                                                                                        | Not read: the purity test booby-traps them                                                                                                     | Task 10    |
| Offline and slow                                                                                                                                     | Not applicable: no I/O. The same code grades on the device.                                                                                    | —          |
| Largest text, screen reader, Reduce Motion                                                                                                           | Not applicable to this package (FE-04)                                                                                                         | —          |

Known limits, stated so nobody is surprised: "Beatles, The" doesn't match "The Beatles"; "&" doesn't match "and"; an ordering question with a genuine tie has one accepted order. Each is handled by an alias or by rewriting the question (note 4 under "Notes for neighbouring tickets").

---

## Tasks

Order: core against toy types first, so the core is finished before any real type exists; then scoring; then the five types, each starting from its fixtures; then the proofs.

### Task 1: Package wiring, module contract, registry

**Files:**

- Modify: `packages/quiz-engine/package.json`, `packages/quiz-engine/tsconfig.json`, `eslint.config.js`
- Create: `packages/quiz-engine/src/core/module.ts`, `packages/quiz-engine/src/core/registry.ts`
- Create: `packages/quiz-engine/tests/support/toy-types.ts`, `packages/quiz-engine/tests/core/registry.test.ts`, `packages/quiz-engine/tests/node/tsconfig.json`

**Interfaces:**

- Consumes: nothing.
- Produces: everything under `core/module.ts` and `core/registry.ts` in Public API. `tests/support/toy-types.ts` exports `toyFlag` (type `toy_flag`; payload `{}`; key and response `{ value: boolean }`; no tunables) and `toyWord` (type `toy_word`; payload `{ hint: string }`; key and response `{ word: string }`; tunables `{ ignoreCase: boolean }`; `check` returns an issue at `['key', 'word']` when the word equals the hint), plus `toyRegistry = createRegistry([toyFlag, toyWord])`. Task 2 adds `toyKits` to the same file.

- [x] **Step 1: Install.** Re-read zod.dev and fast-check.dev for breaking notes, then run:

```bash
pnpm --filter @repo/quiz-engine add zod@^4.6.7 '@repo/content-blocks@workspace:*'
pnpm --filter @repo/quiz-engine add -D fast-check@^4.10.2
```

- [x] **Step 2: Configure the package.** `tsconfig.json` becomes `{ "extends": "@repo/config/tsconfig/base.json", "compilerOptions": { "allowImportingTsExtensions": true }, "include": ["src", "tests"], "exclude": ["tests/node"] }`. `tests/node/tsconfig.json` is the same with `"types": ["node"]` added and `"include": ["."]`, no `exclude`. The `typecheck` script becomes `tsc --noEmit && tsc --noEmit -p tests/node`. `src/` stays without Node types.

- [x] **Step 3: Add the lint rules.** `eslint.config.js` becomes:

```js
import base from '@repo/config/eslint';
import { defineConfig } from 'eslint/config';

const outsideTheEngine = [
  'node:*',
  'react',
  'react-native',
  'react-native/*',
  'expo',
  'expo-*',
  'vitest',
  'fast-check',
];
const outsideTheCore = ['**/types/**', '**/text/**', '**/fixtures/**', '@repo/content-blocks'];

export default defineConfig(
  base,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Graders and scoring are pure (ENG-02): no clock, no randomness, no locale, no platform, no module state.
    files: ['packages/quiz-engine/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'Date', 'Intl', 'performance', 'crypto', 'globalThis'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random' }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(toLocaleLowerCase|toLocaleUpperCase|toLocaleString|localeCompare)$/]',
          message: 'The engine never reads the environment locale.',
        },
        {
          selector:
            'Program > VariableDeclaration[kind!="const"], Program > ExportNamedDeclaration > VariableDeclaration[kind!="const"]',
          message: 'No module-level mutable state.',
        },
        {
          selector:
            'Program > VariableDeclaration > VariableDeclarator > NewExpression[callee.name=/^(Map|Set|WeakMap|WeakSet)$/]',
          message: 'No module-level caches.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: outsideTheEngine, message: 'The engine is pure TypeScript.' }] },
      ],
    },
  },
  {
    // The core knows no question type: a sixth type must not need an edit here.
    files: ['packages/quiz-engine/src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...outsideTheEngine, ...outsideTheCore],
              message: 'The core imports no question type, text helper or fixture.',
            },
          ],
        },
      ],
    },
  },
);
```

- [x] **Step 4: Write the failing tests** in `tests/core/registry.test.ts`:

| Test name                                                                           | Asserts                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QT-01: builds question, player-question and answer schemas from the modules alone` | `toyRegistry.types` equals `['toy_flag', 'toy_word']`; `questionSchema` parses a sound question of each type; `answerSchema` parses `{ type: 'toy_flag', response: { value: true } }`                                                                                                               |
| `the question schema is strict`                                                     | An extra top-level property, an extra payload property, and an unknown `type` each fail                                                                                                                                                                                                             |
| `the player-question schema refuses an object that carries a key`                   | `playerQuestionSchema.safeParse({ type: 'toy_flag', payload: {}, key: { value: true } }).success` is `false`; the same object without `key` passes                                                                                                                                                  |
| `runs a module's check as part of the question schema`                              | A `toy_word` question whose word equals its hint fails with an issue whose path is `['key', 'word']`                                                                                                                                                                                                |
| `builds a tunables schema keyed by type, only for modules that declare one`         | `tunablesSchema` parses `{ toy_word: { ignoreCase: true } }` and refuses `{}` and `{ toy_word: {}, toy_flag: {} }`                                                                                                                                                                                  |
| `get returns the module, or undefined for an unknown type`                          | `get('toy_flag')` is `toyFlag`; `get('nope')` is `undefined`                                                                                                                                                                                                                                        |
| `refuses an empty list and a repeated type id at construction`                      | `createRegistry([])` and `createRegistry([toyFlag, toyFlag])` throw                                                                                                                                                                                                                                 |
| `grade constructors keep the credit invariants`                                     | `correct()` is `{ status: 'correct', credit: 1 }`; `incorrect()` has credit 0; `incorrect(0.5)` has credit 0.5; `incorrect(1)` and `incorrect(-0.1)` throw; `invalid('malformed')` carries the reason; `gradeSchema` refuses `{ status: 'correct', credit: 0.5 }` and a `reason` on a correct grade |

- [x] **Step 5: Run and see them fail.** `pnpm exec vitest run packages/quiz-engine` · Expected: FAIL, cannot resolve `../../src/core/registry.ts`.

- [x] **Step 6: Implement `module.ts` and `registry.ts`** to the signatures in Public API. `questionSchema` is a `z.discriminatedUnion('type', …)` of one `z.strictObject({ type: z.literal(m.type), payload: m.payloadSchema, key: m.keySchema })` per module, each with a `superRefine` that turns the module's `QuestionIssue`s into zod issues. If zod refuses a refined object as a union member, apply one `superRefine` to the union that looks the module up by `type`.

- [x] **Step 7: Run and see them pass**, then `pnpm verify` · Expected: green.

- [x] **Step 8: Commit.** `feat(quiz-engine): add the question-type module contract and registry (ENG-02)`

### Task 2: Generic grading, key stripping, the fixture runner

**Files:**

- Create: `src/core/grading.ts`, `src/core/conformance.ts`, `src/core/equal.ts`
- Create: `tests/core/grading.test.ts`, `tests/core/conformance.test.ts`, `tests/support/registry-properties.ts`, `tests/core/grading.properties.test.ts`

**Interfaces:**

- Consumes: Task 1.
- Produces: `gradeAnswer`, `toPlayerQuestion`, `runGradingFixtures`, the fixture types, `deepEqual(a: unknown, b: unknown): boolean` (internal). `tests/support/toy-types.ts` gains `toyKits: TypeKit[]`. `tests/support/registry-properties.ts` exports

```ts
export interface TypeKit {
  readonly type: string;
  readonly question: fc.Arbitrary<{ type: string; payload: unknown; key: unknown }>;
  readonly correctResponse: (question: { payload: unknown; key: unknown }) => unknown;
  readonly wrongResponse: (question: { payload: unknown; key: unknown }) => fc.Arbitrary<unknown>;
}
export function describeRegistryProperties(
  label: string,
  registry: Registry<readonly AnyQuestionTypeModule[]>,
  kits: readonly TypeKit[],
  tunables: unknown,
  locale: fc.Arbitrary<string>,
): void;
```

- [x] **Step 1: Write the failing unit tests.**

| File · test name                                                                    | Asserts (toy registry, tunables `{ toy_word: { ignoreCase: true } }`, locale `'en'`)                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grading.test.ts › null and undefined answers are unanswered`                       | Both give `{ status: 'unanswered', credit: 0 }`                                                                                                                     |
| `› a correct and a wrong response`                                                  | `toy_flag` key `true`: response `true` is `correct()`, `false` is `incorrect()`                                                                                     |
| `› an answer tagged with another registered type is invalid: type_mismatch`         | A `toy_word` answer to a `toy_flag` question gives `{ status: 'invalid', credit: 0, reason: 'type_mismatch' }`                                                      |
| `› a question of an unregistered type is invalid: unknown_type`                     | `{ type: 'hologram', payload: {}, key: {} }` with any answer gives reason `unknown_type` and doesn't throw                                                          |
| `› a response that fails the module's schema is invalid: malformed`                 | `'yes'`, `42`, `[]`, `{}`, `{ type: 'toy_flag' }`, `{ type: 'toy_flag', response: { value: 'true' } }`, `{ type: 'toy_flag', response: { value: true, extra: 1 } }` |
| `› hands the module its own tunables and the question's locale`                     | With `ignoreCase: true`, "PARIS" matches "paris"; with `false` it doesn't. A spy module receives `locale: 'pt-BR'` unchanged.                                       |
| `› toPlayerQuestion drops the key and nothing else`                                 | The result deep-equals `{ type, payload }`, parses with `playerQuestionSchema`, and the input object is unchanged                                                   |
| `conformance.test.ts › reports each failing fixture by id with expected and actual` | Two passing fixtures and one with a wrong `expected` give `{ ran: 3, failures: [{ id, expected, actual }] }`                                                        |
| `› a fixture's own tunables replace the runner's`                                   | A `toy_word` fixture with `tunables: { toy_word: { ignoreCase: false } }` grades case-sensitively                                                                   |
| `› deepEqual compares plain JSON structurally`                                      | Key order doesn't matter; array order does; `0` and `-0` are equal; a missing key and an `undefined` value are equal                                                |

- [x] **Step 2: Write the generic property suite** `describeRegistryProperties`. Each bullet is one `it`, run for every kit:
  - `QT-02: grading the same question and answer twice gives deep-equal grades` (answers from `fc.oneof(correct, wrong, fc.jsonValue())`).
  - `graders are total: any JSON value as the answer yields a grade and never throws` (`fc.jsonValue()`).
  - `grade invariants hold`: correct ⇔ credit 1; unanswered or invalid ⇒ credit 0; incorrect ⇒ 0 ≤ credit < 1; `reason` is present exactly when the status is `invalid`.
  - `the response built from the key is correct`.
  - `a response the kit calls wrong is never correct`.
  - `an answer tagged with any other registered type is invalid: type_mismatch`.
  - `every generated question parses, and its player form parses and has no key`.
  - `graders are pure: deep-frozen inputs are not mutated` (deep-freeze question, answer and tunables; grade; no throw; inputs deep-equal a JSON copy taken before; `structuredClone` isn't in the ES2022 library the tests compile against).
- [x] **Step 3:** `tests/core/grading.properties.test.ts` calls `describeRegistryProperties('toy registry', toyRegistry, toyKits, …)`. Run: FAIL, `grading.ts` missing.
- [x] **Step 4: Implement** `grading.ts`, `conformance.ts`, `equal.ts`. `gradeAnswer` order: unknown type → `null`/`undefined` → not `{ type, response }` → type differs → `responseSchema.safeParse` fails → `module.grade`.
- [x] **Step 5: Run and see them pass**, then `pnpm verify`.
- [x] **Step 6: Commit.** `feat(quiz-engine): grade through the registry and run fixtures without a test runner (ENG-02)`

### Task 3: Scoring and session evaluation

**Files:**

- Create: `src/core/scoring.ts`, `src/core/session.ts`
- Create: `tests/core/scoring.test.ts`, `tests/core/scoring.properties.test.ts`, `tests/core/session.test.ts`

**Interfaces:**

- Consumes: `Grade` and its constructors (Task 1), `gradeAnswer` (Task 2).
- Produces: everything under `core/scoring.ts` and `evaluateSession` in Public API.

- [x] **Step 1: Write the failing unit tests.** `C` is `specScoringConfig`; `timed(e, l)` is `{ timed: true, elapsedMs: e, standardLimitMs: l }`.

```ts
it('§10.5 base points are 100 × the difficulty multiplier', () => {
  expect(
    scoreAnswer({ grade: correct(), difficultyMultiplier: 0.8, timing: { timed: false } }, 0, C)
      .base,
  ).toBe(80);
  expect(
    scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: { timed: false } }, 0, C)
      .base,
  ).toBe(150);
  expect(
    scoreAnswer({ grade: correct(), difficultyMultiplier: 1.15, timing: { timed: false } }, 0, C)
      .base,
  ).toBe(115);
});
it('§10.5 speed bonus is up to +50% of base, proportional to time left on the Standard limit', () => {
  // DS-01's example: an easy answer with 80% of the limit left is 80 + 32 = 112.
  expect(
    scoreAnswer(
      { grade: correct(), difficultyMultiplier: 0.8, timing: timed(4_000, 20_000) },
      0,
      C,
    ),
  ).toEqual({
    base: 80,
    speedBonus: 32,
    combo: 0,
    total: 112,
    streak: 1,
  });
  expect(
    scoreAnswer({ grade: correct(), difficultyMultiplier: 1.5, timing: timed(0, 20_000) }, 0, C)
      .speedBonus,
  ).toBe(75);
  expect(
    scoreAnswer(
      { grade: correct(), difficultyMultiplier: 1.15, timing: timed(10_000, 30_000) },
      0,
      C,
    ).total,
  ).toBe(153);
});
it('§10.5 combo adds 10 per consecutive correct answer after the first, capped at 50', () => {
  const eight = Array.from({ length: 8 }, () => ({
    grade: correct(),
    difficultyMultiplier: 1,
    timing: { timed: false } as const,
  }));
  const score = scoreSession(eight, C);
  expect(score.answers.map((a) => a.combo)).toEqual([0, 10, 20, 30, 40, 50, 50, 50]);
  expect(score.totalPoints).toBe(1050);
});
it('D13: an answer after the Standard limit keeps its base points and earns no speed bonus', () => {
  // A ×2 player answering at 30 s on a 20 s Standard limit, and a Standard player at exactly 20 s.
  const late = scoreAnswer(
    { grade: correct(), difficultyMultiplier: 1.5, timing: timed(30_000, 20_000) },
    0,
    C,
  );
  const atLimit = scoreAnswer(
    { grade: correct(), difficultyMultiplier: 1.5, timing: timed(20_000, 20_000) },
    0,
    C,
  );
  expect(late).toEqual({ base: 150, speedBonus: 0, combo: 0, total: 150, streak: 1 });
  expect(atLimit).toEqual(late);
});
it("D13: scoring has no input for the player's time setting", () => {
  const input = { grade: correct(), difficultyMultiplier: 1, timing: timed(1_000, 20_000) };
  expect(scoreInputSchema.safeParse(input).success).toBe(true);
  expect(scoreInputSchema.safeParse({ ...input, timeMultiplier: 2 }).success).toBe(false);
  expect(
    scoreInputSchema.safeParse({ ...input, timing: { ...input.timing, extendedLimitMs: 40_000 } })
      .success,
  ).toBe(false);
});
```

Further cases, one `it` each:

| Test name                                                                      | Asserts                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `§10.5 an answer that isn't correct scores 0 and resets the streak`            | `incorrect()`, `unanswered()` and `invalid('malformed')` after a streak of 3 each give `{ base: 0, speedBonus: 0, combo: 0, total: 0, streak: 0 }`; the next correct answer has combo 0                                               |
| `§10.5 untimed answers earn no speed bonus`                                    | `timing: { timed: false }` gives `speedBonus` 0 with base and combo intact                                                                                                                                                            |
| `§10.5 every value comes from the config passed in`                            | With `{ basePoints: 200, speedBonusMaxRatio: 1, comboStep: 5, comboCap: 5 }` the DS-01 input scores base 160, speed 128; a third correct answer has combo 5                                                                           |
| `§10.5 the difficulty multiplier is a clamped line between the rating anchors` | 1200 → 0.8; 1800 → 1.5; 1500 → 1.15 (`toBeCloseTo`); 900 → 0.8; 2400 → 1.5                                                                                                                                                            |
| `time at, just inside and beyond the limit`                                    | Elapsed 20 000 and 20 001 of 20 000 give bonus 0; 19 999 gives 0 after rounding; 10 000 gives 25 at multiplier 1                                                                                                                      |
| `impossible time values can't raise a score`                                   | Called without the schema: elapsed −5 000 gives the same bonus as 0; a limit of 0 gives bonus 0; `NaN` elapsed gives bonus 0; every field of the result is a finite integer                                                           |
| `the config and input schemas refuse impossible values`                        | `scoringConfigSchema` refuses a negative `comboStep`, `minRating ≥ maxRating`, `minMultiplier > maxMultiplier`, a non-integer `basePoints`, unknown keys; `scoreInputSchema` refuses negative or fractional `elapsedMs`, a limit of 0 |
| `partial credit scales base and speed bonus and breaks the streak`             | `incorrect(0.5)` at multiplier 1, `timed(0, 20_000)`, streak 3 gives `{ base: 50, speedBonus: 25, combo: 0, total: 75, streak: 0 }`                                                                                                   |
| `session.test.ts › evaluateSession grades then scores, in order`               | Three toy items (correct, `null`, correct) with the spec config give grades `[correct, unanswered, correct]`, `correctCount` 2, `questionCount` 3, and the second correct answer's combo is 0                                         |
| `session.test.ts › scoreSession of no answers`                                 | `{ answers: [], totalPoints: 0, correctCount: 0, questionCount: 0 }`                                                                                                                                                                  |

- [x] **Step 2: Write the failing properties** in `tests/core/scoring.properties.test.ts`. Arbitraries: a valid `ScoringConfig`; grades from the four constructors with any credit; multipliers 0.5–2; `elapsedMs` 0–120 000; `standardLimitMs` 1 000–60 000.
  - `total is base + speedBonus + combo, and every part is a finite integer ≥ 0`.
  - `the speed bonus never exceeds round(base × speedBonusMaxRatio) and never rises as elapsed time rises`.
  - `D13: at or beyond the Standard limit the speed bonus is 0`.
  - `D13: Standard, ×1.5 and ×2 players with the same answers and times score the same`: build three sessions whose only difference is a `setting` the test holds outside `ScoreInput`, with elapsed times up to `setting × standardLimitMs`; where the elapsed times are equal, `scoreSession` results are deep-equal.
  - `combo is min(comboStep × (streak − 1), comboCap) on a correct answer and 0 otherwise`.
  - `scoreSession equals folding scoreAnswer over the inputs`, and `totalPoints` is the sum of the totals.
  - `difficultyMultiplier is monotonic in the rating and stays within [minMultiplier, maxMultiplier]`.
- [x] **Step 3: Run and see them fail** (`scoring.ts` missing).
- [x] **Step 4: Implement** to the arithmetic block in Public API. `round` is `Math.round`.
- [x] **Step 5: Run and see them pass**, then `pnpm verify`.
- [x] **Step 6: Commit.** `feat(quiz-engine): score answers and sessions from tunables passed in (ENG-02)`

### Task 4: The Standard limit (R1; drop this task if the PM rules it out)

**Files:** Create `src/core/timing.ts`, `tests/core/timing.test.ts`.

**Interfaces:** Consumes `TimeClass` (Task 1). Produces everything under `core/timing.ts` in Public API.

- [x] **Step 1: Write the failing test** `§10.3 the Standard limit is 20 s for choice types, 30 s for constructed answers, +10 s with media or math`: with `specTimingConfig`, `standardLimitMs('choice', false, …)` is 20 000; `('constructed', false)` is 30 000; `('choice', true)` is 30 000; `('constructed', true)` is 40 000. A second test, `every value comes from the config`, uses `{ choiceMs: 1, constructedMs: 2, mediaBonusMs: 4 }` and expects 1, 2, 5, 6. A third: `timingConfigSchema` refuses zero, negative and fractional values (amended by the PM on 2026-11-15: `mediaBonusMs` may be 0, a config with no media bonus; the two limits may not).
- [x] **Step 2: Run, fail. Step 3: Implement. Step 4: Run, pass; `pnpm verify`.**
- [x] **Step 5: Commit.** `feat(quiz-engine): derive the Standard time limit from a type's time class (ENG-02)`

### Task 5: `single_choice`, `image_choice`, `true_false`

**Files:**

- Create: `src/types/content.ts`, `src/types/choice.ts`, `src/types/single-choice.ts`, `src/types/image-choice.ts`, `src/types/true-false.ts`, `src/types/index.ts`
- Create: `src/fixtures/content.ts`, `src/fixtures/single-choice.ts`, `src/fixtures/image-choice.ts`, `src/fixtures/true-false.ts`, `src/fixtures/index.ts`
- Create: `tests/types/choice.test.ts`, `tests/support/arbitraries.ts`, `tests/fixtures.test.ts`, `tests/grading.properties.test.ts`
- Modify: `packages/quiz-engine/package.json` (add the export `"./fixtures": "./src/fixtures/index.ts"`)

**Interfaces:**

- Consumes: Tasks 1 and 2; the ENG-01 names under "Assumptions about ENG-01".
- Produces: `singleChoice`, `imageChoice`, `trueFalse` modules; `mvpQuestionTypes`, `mvpRegistry` and `specMvpTunables` (three types and an empty tunables object so far; Tasks 6 and 8 extend them); `gradingFixtures`; in `types/choice.ts`, `optionIdSchema`, `checkOptions(options, correctOptionId): QuestionIssue[]` and `gradeChoice(optionIds, correctOptionId, response): Grade`; in `fixtures/content.ts`, `text(value: string): ContentBlocks` and `image(assetId: string, alt: string): ImageBlock`; in `tests/support/arbitraries.ts`, `mvpKits: TypeKit[]`. A kit generates only questions the registry's schema accepts.

- [x] **Step 1: Confirm A1–A5** against merged ENG-01, and write `src/types/content.ts` and `src/fixtures/content.ts`.
- [x] **Step 2: Write the fixtures first.** Questions: _SC_ "Which planet has the shortest day?" with options `a` Earth, `b` Jupiter, `c` Mars, `d` Venus, key `b`. _IC_ the same four as images, key `b`. _TF_ "Jupiter has the shortest day of any planet in the Solar System", key `true`. All cite QT-02.

| Fixture id                                                         | Answer                                                                  | Expected                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------ |
| `single_choice/correct`                                            | `{ type: 'single_choice', response: { optionId: 'b' } }`                | correct                  |
| `single_choice/wrong`                                              | option `a`                                                              | incorrect, credit 0      |
| `single_choice/unanswered`                                         | `null`                                                                  | unanswered               |
| `single_choice/unknown-option`                                     | option `z`                                                              | invalid, `malformed`     |
| `single_choice/wrong-type`                                         | `{ type: 'true_false', response: { value: true } }`                     | invalid, `type_mismatch` |
| `single_choice/bare-string`                                        | `'b'`                                                                   | invalid, `malformed`     |
| `single_choice/extra-key`                                          | `{ type: 'single_choice', response: { optionId: 'b', correct: true } }` | invalid, `malformed`     |
| `image_choice/correct`, `/wrong`, `/unanswered`, `/unknown-option` | as above, tagged `image_choice`                                         | as above                 |
| `true_false/correct`                                               | `{ type: 'true_false', response: { value: true } }`                     | correct                  |
| `true_false/wrong`                                                 | value `false`                                                           | incorrect                |
| `true_false/unanswered`                                            | `null`                                                                  | unanswered               |
| `true_false/string-true`                                           | value `'true'`                                                          | invalid, `malformed`     |

- [x] **Step 3: Write the failing tests.**
  - `tests/fixtures.test.ts › every fixture question parses with the registry's question schema` · `› fixture ids are unique and start with their question's type` · `› QT-02: every shared fixture passes` (for now via `runGradingFixtures(mvpRegistry, gradingFixtures, specMvpTunables)`).
  - `tests/types/choice.test.ts`, each asserting `mvpRegistry.questionSchema.safeParse(...)` fails with the stated path: `refuses fewer than 2 or more than 4 options` (`['payload', 'options']`) · `refuses duplicate option ids` · `refuses a key that names no option` (`['key', 'correctOptionId']`) · `refuses two options with the same content` (duplicate options, CT-02's "duplicate answer") · `refuses an option with no content` · `refuses an image option without alt text` (if A3 holds) · `true_false refuses any payload property`.
  - `tests/grading.properties.test.ts`: `describeRegistryProperties('MVP registry', mvpRegistry, mvpKits, specMvpTunables, …)`, plus `the order of options in the payload never changes a grade` (shuffle `payload.options`, same grade), plus the same generic properties with questions drawn from `gradingFixtures` by `fc.constantFrom`.
- [x] **Step 4: Run and see them fail.**
- [x] **Step 5: Implement** the three modules, `choice.ts` and the catalogue. Equal content is `deepEqual` on the parsed blocks.
- [x] **Step 6: Run and see them pass**, then `pnpm verify` (the workspace test now checks that `./fixtures` resolves).
- [x] **Step 7: Commit.** `feat(quiz-engine): add single_choice, image_choice and true_false with shared fixtures (ENG-02)`

### Task 6: `ordering`

**Files:** Create `src/types/ordering.ts`, `src/fixtures/ordering.ts`, `tests/types/ordering.test.ts`. Modify `src/types/index.ts`, `src/fixtures/index.ts`, `tests/support/arbitraries.ts`.

**Interfaces:** Consumes Tasks 1, 2, 5. Produces the `ordering` module and its `TypeKit`.

- [x] **Step 1: Write the fixtures first.** Question _ORD_: "Order these planets from nearest to the Sun"; `payload.items` stored as `mars`, `mercury`, `earth`, `venus`; key order `mercury`, `venus`, `earth`, `mars`.

| Fixture id               | Response order                       | Expected             |
| ------------------------ | ------------------------------------ | -------------------- |
| `ordering/correct`       | mercury, venus, earth, mars          | correct              |
| `ordering/partly-right`  | mercury, venus, mars, earth (2 of 4) | incorrect, credit 0  |
| `ordering/reversed`      | mars, earth, venus, mercury          | incorrect            |
| `ordering/untouched`     | mars, mercury, earth, venus          | incorrect            |
| `ordering/missing-item`  | mercury, venus, earth                | invalid, `malformed` |
| `ordering/repeated-item` | mercury, mercury, earth, mars        | invalid, `malformed` |
| `ordering/unknown-item`  | mercury, venus, earth, pluto         | invalid, `malformed` |
| `ordering/unanswered`    | `null`                               | unanswered           |

- [x] **Step 2: Write the failing tests** in `tests/types/ordering.test.ts`: `refuses fewer than 3 or more than 6 items` · `refuses a key that isn't a permutation of the item ids` (`['key', 'order']`) · `refuses items already stored in key order` (`['payload', 'items']`: the payload would give the answer away) · `refuses two items with the same content`. Properties: `ordering: any permutation other than the key's is incorrect with credit 0` · `ordering: the stored order of items never changes a grade`.
- [x] **Step 3: Run, fail. Step 4: Implement. Step 5: Run, pass; `pnpm verify`.**
- [x] **Step 6: Commit.** `feat(quiz-engine): grade ordering questions (ENG-02)`

### Task 7: Text toolkit

**Files:** Create `src/text/normalize.ts`, `src/text/edit-distance.ts`, `src/text/number.ts`, `tests/text/normalize.test.ts`, `tests/text/edit-distance.test.ts`, `tests/text/number.test.ts`, `tests/text/text.properties.test.ts`.

**Interfaces:** Consumes nothing. Produces `normalizeAnswerText`, `editDistance`, `parseNumberReadings`.

The three algorithms are decisions, so they are fixed here.

**`normalizeAnswerText(text, locale, articles)`**

1. `text.normalize('NFKD')`.
2. Fold case with no locale: `.toLowerCase().toUpperCase().toLowerCase()`.
3. `.normalize('NFKD')` again, then delete the combining marks U+0300–036F, U+1AB0–1AFF, U+1DC0–1DFF, U+20D0–20FF, U+FE20–FE2F.
4. Fold letters that don't decompose: ø→o, ł→l, đ→d, ð→d, þ→th, æ→ae, œ→oe, ħ→h, ŧ→t.
5. Replace each separator character (listed below) with a space.
6. Delete each ignored character (listed below). Delete `.` and `,` too, except where one sits directly between two ASCII digits: `3.14` must not become `314`. Use a `replace` callback that looks at the neighbouring characters; lookbehind is not available.
7. Collapse each run of `\s` to one space and trim.
8. Take the primary subtag of `locale` (lower-cased, up to the first `-` or `_`). If the string starts with one of `articles[subtag]` followed by a space and something remains after it, drop that article once.

> **As built (2026-11-15), three deviations, each from a counterexample.** (a) Step 8 drops _every_ leading article, not one: dropping one left "The A-Team" as `a team` and "A-Team" as `team`, and made "The The The" not idempotent. (b) Step 2 also folds the final sigma `ς` into `σ`: lower-casing chooses between them by what follows, and steps 5 and 6 change what follows ("ΑΣ(Α" gave `αςα`, then `ασα`). Repeating steps 1–4 could not fix either. (c) In step 6 the ignored characters go first and the dot-and-comma rule runs on what is left, so a zero-width space inside "3.14" does not turn it into `314`. (d) The property `normalization ignores letter case` upper-cases the text from its canonical (NFD) form. Upper-casing turns a Greek iota subscript into a letter where it stands, so on text stored in another order a later mark moves onto that letter: a different text by Unicode's own rules, which no keyboard produces. The normalizer is unchanged; the limit is a named case.

```text
separators (step 5):  - ‐ ‑ ‒ – — ― _ / \
ignored (step 6):     ; : ! ? ¡ ¿ ' ’ ‘ ‛ " “ ” „ « » ` ´ ( ) [ ] { } … ·
                      and U+00AD, U+200B to U+200F, U+2060, U+FEFF
```

If the idempotence property finds a counterexample, repeat steps 1–4 until the string stops changing (at most three passes) and add the counterexample as a named case.

**`editDistance(a, b, max)`**: optimal string alignment distance (insert, delete, substitute, swap two adjacent characters: one edit each) over code points. Returns `max + 1` as soon as the distance must exceed `max`.

**`parseNumberReadings(text)`**: every number the text can mean, with no locale.

1. `text.normalize('NFKC')`, trim, replace U+2212 with `-`, delete every `\s`, `'`, `’` and `_`.
2. The result must match `^[+-]?(\d[\d.,]*\d|\d|[.,]\d+)$`; otherwise return `[]`.
3. No separator: one reading.
4. Both `.` and `,` present: the one that occurs last is the decimal point and must occur once (else `[]`); delete the other.
5. One kind, more than once: all are grouping; delete them.
6. One kind, once: the decimal reading always; and the grouping reading too when exactly three digits follow it and one to three digits precede it, the first not `0`.
7. Return the finite readings.

- [x] **Step 1: Write the failing unit tests.** `en` is `{ en: ['the', 'a', 'an'] }`.

| Test name                                                                      | Cases (`input` → `expected`, locale `en` unless stated)                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QT-03 case`                                                                   | `PARIS` → `paris`; `Straße` and `STRASSE` → `strasse`; `İstanbul` → `istanbul`; `ΟΔΟΣ` equals `οδος` after normalization                                                                                                                                            |
| `QT-03 diacritics`                                                             | `París` → `paris`; `Malmö` → `malmo`; `Łódź` → `lodz`; `Tromsø` → `tromso`; NFC and NFD `é` agree; `कि` and `की` stay different                                                                                                                                     |
| `QT-03 whitespace`                                                             | `"  New \t York\n"` → `new york`; a no-break space and U+3000 collapse; a zero-width space (U+200B) inside `paris` is removed                                                                                                                                       |
| `QT-03 punctuation`                                                            | `St. John's` → `st johns`; `Jean-Paul` → `jean paul`; `AC/DC` → `ac dc`; `C++` → `c++`; `C#` → `c#`; `!!!` → empty string; `U.S.A.` → `usa`; `3.14` → `3.14`; `3,14.` → `3,14`; `v1.2, final` → `v1.2 final`                                                        |
| `QT-03 leading articles follow the question's locale`                          | `The Beatles` → `beatles`; `An Apple` → `apple`; `A` → `a`; `Theatre` → `theatre`; `The The` → `the`; under `es` with `en` only: `The Beatles` → `the beatles`; under `es-MX` with `{ es: ['el', 'la', 'los', 'las'] }`: `La Paz` → `paz`                           |
| `full-width and compatibility forms`                                           | `ＰＡＲＩＳ` → `paris`; `ﬁn` → `fin`                                                                                                                                                                                                                                |
| `editDistance counts insert, delete, substitute and adjacent swap as one edit` | `('paris', 'paris', 2)` 0; `('pais', 'paris', 2)` 1; `('parsi', 'paris', 2)` 1; `('austria', 'australia', 2)` 2; code points: `('a😀b', 'ab', 2)` 1                                                                                                                 |
| `editDistance stops once the distance exceeds max`                             | `('kitten', 'sitting', 1)` 2; `('abc', 'abd', 0)` 1; two 256-character strings that differ everywhere with `max` 2 return 3                                                                                                                                         |
| `parseNumberReadings reads plain, grouped and decimal forms`                   | `1000` → `[1000]`; `1,234.56` and `1.234,56` → `[1234.56]`; `1,234,567` and `1.234.567` → `[1234567]`; `1,00,000` → `[100000]`; `3,14` and `3.14` → `[3.14]`; `.5` → `[0.5]`; `1 000` and `1'000` → `[1000]`; `−5` and `-5` → `[-5]`; `+5` → `[5]`; `１２` → `[12]` |
| `parseNumberReadings returns both readings when one separator is ambiguous`    | `1,000` and `1.000` → 1 and 1000 (either order); `12.345` → 12.345 and 12345; `0,500` → `[0.5]`; `1234,567` → `[1234.567]`                                                                                                                                          |
| `parseNumberReadings refuses what isn't a plain number`                        | `1e3`, `1/2`, `0x10`, `five`, `NaN`, `Infinity`, `1.2.3,4.5`, `5.`, `--5`, `5 km`, empty string → `[]`                                                                                                                                                              |

- [x] **Step 2: Write the failing properties** (`fc.string({ unit: 'grapheme' })` and `fc.string({ unit: 'binary' })`, plus the explicit examples `'\uD800'` and `'a\uDFFFb'`):
  - `normalization is idempotent`.
  - `normalization ignores letter case` (`normalize(s.toUpperCase())` and `normalize(s.toLowerCase())` equal `normalize(s)`).
  - `normalization gives the same result for the NFC and NFD forms of a string`.
  - `normalized text has no leading, trailing or doubled spaces`.
  - `normalization never throws, lone surrogates included`.
  - `editDistance is symmetric, is 0 exactly for equal strings, and agrees with an unbounded reference when the result is ≤ max` (the reference is a plain full-matrix implementation in the test file).
  - `a number written in English, German or plain form is among its own readings` (integers and decimals with up to six places, formatted by helpers in the test).
- [x] **Step 3: Run, fail. Step 4: Implement. Step 5: Run, pass; `pnpm verify`.**
- [x] **Step 6: Commit.** `feat(quiz-engine): normalize typed answers without reading a locale (ENG-02)`

### Task 8: `type_answer`

**Files:** Create `src/types/type-answer.ts`, `src/fixtures/type-answer.ts`, `tests/types/type-answer.test.ts`. Modify `src/types/index.ts`, `src/fixtures/index.ts`, `tests/support/arbitraries.ts`.

**Interfaces:** Consumes Tasks 1, 2, 5, 7. Produces the `typeAnswer` module, `typeAnswerTunablesSchema`, `specTypeAnswerTunables`, and the `type_answer` entry of `specMvpTunables`.

The grader, in order. `n(x)` is `normalizeAnswerText(x, locale, tunables.articles)`; `input = n(response.text)`.

1. `input` is empty → incorrect.
2. `input` equals `n(r)` for a rejected entry `r` → incorrect.
3. If `key.numeric` is set: lower-case the response text and strip one listed unit from its start or its end, then take `parseNumberReadings`. If there are readings, the number decides and nothing below runs: correct when any reading `x` has `|x − value| ≤ tolerance + 1e-9 × max(1, |value|)`, else incorrect. With no readings, go on.
4. `input` equals `n(a)` for an accepted entry `a` (ignoring entries that normalize to empty) → correct.
5. For each accepted entry `a`, in order: `allowed = min(threshold(length of n(a) in code points), key.maxTypos if given)`, where `threshold` is the `maxEdits` of the last `typoThresholds` entry whose `minLength` is ≤ the length, or 0. If `allowed > 0`, and `input` and `n(a)` contain the same ASCII digits in the same order, and `d = editDistance(input, n(a), allowed) ≤ allowed`, and no rejected entry is within `d` edits of `input` → correct.
6. Otherwise incorrect.

> **As built (2026-11-15).** (a) zod 4.6.7 measures a string's `max` in code points, so the 256-unit cap on the response is its own check (`text.length`); entries and ids keep zod's count, in characters. (b) In step 3 the text and the units are put in NFKC and lower case first, and the longest listed unit that matches is the one removed, from the end or else the start. (c) Typos are also held to a constant of 3 at grading, whatever the tunables say. (d) The tunables schema refuses more than the three things listed below: an article that isn't written as normalized text (it could never match), a language key that isn't a lower-case primary subtag, and a threshold whose `maxEdits` is not below its `minLength`. (e) Three fixtures beyond the table: `number-trailing-zero`, `number-plus-sign`, `unit-symbol`.

- [x] **Step 1: Write the fixtures first.** All cite QT-03; locale `en` and the spec tunables unless stated.

| Question (key)                                                                                      | Fixture id · typed text → expected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accepted `['Paris']`                                                                                | `type_answer/exact` `Paris` → correct · `/case-and-space` `"  PARIS "` → correct · `/diacritics` `París` → correct · `/punctuation` `Paris.` → correct · `/typo-swap` `Parsi` → correct · `/typo-drop` `Pais` → correct · `/wrong` `Lyon` → incorrect · `/empty` `""` → incorrect · `/spaces-only` `"   "` → incorrect · `/punctuation-only` `!!!` → incorrect · `/unanswered` `null` → unanswered · `/over-length` 257 × `a` → invalid `malformed` · `/not-text` response `{ text: 5 }` → invalid `malformed` · `/wrong-type` a `single_choice` answer → invalid `type_mismatch` |
| accepted `['The Beatles', 'Beatles']`                                                               | `/leading-article` `beatles` → correct · `/alias` `Beatles` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| accepted `['The Beatles']`, locale `es`                                                             | `/article-other-locale` `Beatles` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| accepted `['La Paz']`, locale `es-BO`, tunables with `es: ['el', 'la', 'los', 'las']`               | `/article-from-tunables` `Paz` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| accepted `['Mississippi']`                                                                          | `/typo-two-edits` `Missisipi` → correct · `/typo-three-edits` `Misisipi` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| accepted `['Iran']`                                                                                 | `/short-answer-no-typos` `Iraq` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| accepted `['Apollo 11']`                                                                            | `/digits-differ` `Apollo 12` → incorrect · `/digits-same` `Apolo 11` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| accepted `['Australia']`, rejected `['Austria']`                                                    | `/rejected-near-miss` `Austria` → incorrect · `/tie-with-rejected` `Austrlia` → incorrect · `/typo-clear-of-rejected` `Australa` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| accepted `['Mississippi']`, `maxTypos: 0`                                                           | `/typos-off` `Missisippi` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| accepted `['Łódź']`                                                                                 | `/letter-fold` `Lodz` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| accepted `['C++']`                                                                                  | `/symbols-kept` `C` → incorrect · `/symbols-exact` `c++` → correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| format `number`; accepted `['1,000']`; numeric `{ value: 1000, tolerance: 0 }`                      | `/number-plain` `1000` → correct · `/grouping-comma` `1,000` → correct · `/grouping-dot` `1.000` → correct · `/grouping-space` `1 000` → correct · `/number-off` `1001` → incorrect · `/number-words` `one thousand` → incorrect                                                                                                                                                                                                                                                                                                                                                  |
| format `number`; accepted `['3.14']`; numeric `{ value: 3.14, tolerance: 0.01 }`                    | `/decimal-comma` `3,14` → correct · `/tolerance-edge` `3.15` → correct · `/tolerance-out` `3.16` → incorrect · `/separator-dropped` `314` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                             |
| format `number`; accepted `['0.3']`; numeric `{ value: 0.3, tolerance: 0.1 }`                       | `/binary-rounding` `0.4` → correct · `/binary-rounding-out` `0.41` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| format `number`; accepted `['71%']`; numeric `{ value: 71, tolerance: 1, units: ['%', 'percent'] }` | `/unit-suffix` `70 percent` → correct · `/unit-unlisted` `71 km` → incorrect · `/unit-out` `72.5%` → incorrect                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

- [x] **Step 2: Write the failing tests** in `tests/types/type-answer.test.ts`:
  - `QT-03 accepted aliases`, `QT-03 numeric tolerance`, `QT-03 typo tolerance scales with answer length`: each runs its group of fixtures above by id through `runGradingFixtures` and expects no failures.
  - `QT-03 typo thresholds are tunable`: with `typoThresholds: []`, `Parsi` for `Paris` is incorrect; with `[{ minLength: 3, maxEdits: 1 }]`, `Iraq` for `Iran` is correct.
  - `the schema refuses a key it can't grade`: no accepted entry; 21 accepted entries; an entry of 121 characters; `format: 'number'` without `numeric`; `numeric` with `format: 'text'`; a negative or non-finite tolerance; `maxTypos` of −1 or 1.5; an accepted entry of `!!!` (it normalizes to nothing); `Austria` both accepted and rejected.
  - `the tunables schema refuses thresholds out of order, maxEdits above 3 and an article containing a space`.
  - Properties, for text-format questions: `a surface variant of an accepted answer is correct` (random case and surrounding spaces; and a prefixed `the ` under `en` when the entry doesn't itself begin with an article) · `a typo is never forgiven across digits` (changing one digit of an accepted entry that contains digits is never correct).
- [x] **Step 3: Run, fail. Step 4: Implement. Step 5: Run, pass; `pnpm verify`.**
- [x] **Step 6: Commit.** `feat(quiz-engine): grade typed answers with aliases, numbers and typo tolerance (ENG-02)`

### Task 9: Public surface and the shared fixtures' entry point

**Files:** Modify `src/index.ts`, `src/fixtures/index.ts`, `tests/fixtures.test.ts`. Create `src/fixtures/scoring.ts`, `tests/types/catalogue.test.ts`, `tests/public-api.test.ts`.

**Interfaces:** Consumes Tasks 1–8. Produces the package's two entry points exactly as listed in Public API, `scoringFixtures`, `runSharedFixtures`.

- [ ] **Step 1: Write the scoring fixtures** (config: `specScoringConfig`; cite §10.5, and D13 where marked).

| Fixture id                          | Inputs                                                      | Expected                                                           |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `scoring/ds-01-example`             | one correct, multiplier 0.8, 4 000 of 20 000 ms             | base 80, speed 32, combo 0; total 112                              |
| `scoring/combo-ladder`              | eight correct, multiplier 1, untimed                        | combos 0, 10, 20, 30, 40, 50, 50, 50; total 1050; `correctCount` 8 |
| `scoring/combo-reset`               | correct, correct, incorrect, correct; multiplier 1, untimed | totals 100, 110, 0, 100; total 310; `correctCount` 3               |
| `scoring/d13-beyond-standard` (D13) | one correct, multiplier 1.5, 30 000 of 20 000 ms            | base 150, speed 0; total 150                                       |
| `scoring/at-the-limit` (D13)        | one correct, multiplier 1, 20 000 of 20 000 ms              | total 100                                                          |
| `scoring/instant`                   | one correct, multiplier 1.5, 0 of 20 000 ms                 | base 150, speed 75; total 225                                      |
| `scoring/untimed`                   | one correct, multiplier 1.5, untimed                        | total 150                                                          |
| `scoring/unanswered-and-invalid`    | unanswered, then invalid; multiplier 1                      | total 0; `correctCount` 0; `questionCount` 2                       |
| `scoring/rounding`                  | one correct, multiplier 1.15, 10 000 of 30 000 ms           | base 115, speed 38; total 153                                      |

- [ ] **Step 2: Write the failing tests.**
  - `tests/fixtures.test.ts › QT-02: every shared fixture passes` now asserts `runSharedFixtures()` returns `failures: []` and `ran` equal to `gradingFixtures.length + scoringFixtures.length`.
  - `› every registered type has a fixture for correct, incorrect, unanswered and invalid`: computed from `mvpRegistry.types`, so a new type without fixtures fails here.
  - `tests/types/catalogue.test.ts › QT-01: the five MVP types are registered`: `mvpRegistry.types` equals `['single_choice', 'true_false', 'image_choice', 'type_answer', 'ordering']`; `specMvpTunables` parses with `mvpRegistry.tunablesSchema`; each module's `timeClass` matches the table in Public API.
  - `tests/public-api.test.ts › the package exports what the plan lists and nothing else`: the sorted keys of `import('../src/index.ts')` and of `import('../src/fixtures/index.ts')` equal two literal lists. ENG-04 builds on this surface, so growing it is a deliberate edit to this test.
- [ ] **Step 3: Run, fail. Step 4: Implement** `src/index.ts` as re-exports, the scoring fixtures and `runSharedFixtures`. **Step 5: Run, pass; `pnpm verify`.**
- [ ] **Step 6: Commit.** `feat(quiz-engine): publish the engine's API and its shared fixtures (ENG-02)`

### Task 10: Proofs, ADRs, traceability

**Files:** Create `tests/purity.test.ts`, `tests/support/multi-select.ts`, `tests/sixth-type.test.ts`, `tests/node/boundaries.test.ts`, two ADRs. Modify `docs/traceability.md`.

**Interfaces:** Consumes everything. Produces no source code: if a proof fails, the fix belongs to the task that owns the code.

- [ ] **Step 1: `tests/purity.test.ts`.**
  - `graders are pure: the shared fixtures pass with the clock, randomness and locale APIs booby-trapped`: inside the test body, replace `Date.now`, `Math.random`, `String.prototype.toLocaleLowerCase`, `String.prototype.toLocaleUpperCase`, `String.prototype.localeCompare`, `Number.prototype.toLocaleString` with functions that throw, and `globalThis.Intl` with a proxy that throws on any access; call `runSharedFixtures()`; restore everything in `finally`; expect no failures.
  - `evaluating the same completion twice gives deep-equal results (duplicate and retry)`: a session of one fixture per type, evaluated twice.
  - `interleaving two sessions changes neither result (no shared state)`: grade session A's and B's items alternately and compare with grading each alone.
- [ ] **Step 2: `tests/support/multi-select.ts` and `tests/sixth-type.test.ts`.** The module is `multi_select` (the first V1 type in §7.4): payload `{ options }` of 2–6 `{ id, content }`; key `{ correctOptionIds }`; response `{ optionIds }`; `check` requires known, distinct ids and at least one correct; `grade` is correct when the two id sets are equal, invalid `malformed` for an unknown or repeated id, otherwise incorrect. It imports only the package's public API. The test, `a sixth type validates, grades, scores and passes the generic properties with src/core unchanged`, builds `createRegistry([...mvpQuestionTypes, multiSelect])` and asserts:
  1. `types` has six entries, and `expectTypeOf` shows the question union's `type` is `QuestionType | 'multi_select'`;
  2. `questionSchema` parses a sound `multi_select` question and refuses one whose key names an unknown option; `playerQuestionSchema` refuses it with a key;
  3. `gradeAnswer` returns correct, incorrect, and `type_mismatch` for a `single_choice` answer;
  4. `evaluateSession` over one `single_choice` and one `multi_select` item, both correct, multiplier 1, untimed, totals 210;
  5. `runGradingFixtures` passes three `multi_select` fixtures written in the test;
  6. `describeRegistryProperties` passes with a `multi_select` kit added to `mvpKits`.
- [ ] **Step 3: `tests/node/boundaries.test.ts`** (reads files with `node:fs`):
  - `src/core names no question type and imports nothing from types, text or fixtures`: no file under `src/core` contains any id in `mvpRegistry.types`, nor an import specifier containing `/types/`, `/text/`, `/fixtures/` or `@repo/content-blocks`.
  - `src uses only syntax every target engine runs`: no file under `src` contains `\p{`, `\P{`, `(?<` or `Intl.`.
  - `only src/types/content.ts and src/fixtures/content.ts import @repo/content-blocks`.
  - `the fixtures entry point imports no test runner`: nothing under `src` imports `vitest` or `fast-check`.
  - `the package depends on zod and @repo/content-blocks only, at content-blocks' zod range`: read from the two `package.json` files.
- [ ] **Step 4: Run everything.** `pnpm exec vitest run packages/quiz-engine` then `pnpm verify` · Expected: green. Break each proof once by hand to see it fail (name a type in `src/core`, call `Date.now()` in a grader, add `\p{L}` to a regex), then revert.
- [ ] **Step 5: Write the ADRs** from `docs/adr/0000-template.md`, at the next free numbers, status `Proposed`:
  - _Question types are modules in a registry; the engine core names no type._ Decision, the alternatives (a `switch` on type in the grader; one class per type; config captured when a module is built), and the consequence for FE-04 (a renderer map keyed by `QuestionType`).
  - _Grading and scoring readings._ R1–R11 as ruled, the locale-free normalization and number parsing, the portable-syntax rule, and using fast-check without its Vitest connector.
- [ ] **Step 6: Traceability.** Set QT-02 and QT-03 to `built`. QT-01 and §10 also list FE-04 and FE-03: leave them `todo` and say so in the report, unless the PM wants a different marker for a shared row.
- [ ] **Step 7: Re-read the whole diff** for names, dead code, and anything that belongs in another package; run the `security-review` skill over the grading path (it sits on the completion endpoint).
- [ ] **Step 8: Commit.** `test(quiz-engine): prove purity, portability and the sixth-type claim (ENG-02)` and `docs: record the question-type registry and the grading readings (ENG-02)`

---

## Done-when evidence, and what will stay unverified

The report will cite the tests in the Proof map by name, with the `pnpm verify` output.

It will list these under "Not done or not verified", because this ticket can't close them:

- **Hermes.** Vitest and Jest both run on V8. The lint rules and the syntax guard make a difference unlikely, not impossible. `runSharedFixtures()` needs one run on iOS and Android Hermes (first note below).
- **"The app and the server both run" (QT-02).** Neither app exists yet. The entry point is ready; FE-03 and BE-06 each add one assertion.
- **Any reading R1–R11 the PM has not ruled on.**

Guardrails of roadmap §7 that apply: grading and scoring live only in this package; decisions carry ADRs; logic is written test-first; `pnpm verify` is green; the pull request cites its requirement ids. No flag is needed for a library; the typo thresholds are the kill switch for the one risky behaviour.

## Notes for neighbouring tickets (proposed, not built here)

1. **FND-05 or FE-03: run the shared fixtures on a device.** A development-only screen or a smoke test that calls `runSharedFixtures()` on Hermes for iOS and Android and shows the report.
2. **ENG-04: what the session and completion schemas need.** Per question in the snapshot: `difficultyMultiplier`, `standardLimitMs`, `locale`. Per session: the scoring config and type tunables it started with, or a version of them. Per answer in the completion: the tagged answer or `null`, `elapsedMs`, and whether the question was timed. `/config` can embed `scoringConfigSchema`, `timingConfigSchema` and `mvpRegistry.tunablesSchema`. A version number for the engine in the completion would let BE-06 tell an older app from a tampered result.
3. **BE-06: plausibility rules the engine doesn't hold**: an answer later than the player's own limit, and what the player sees when the server's grade differs from the device's (DS-02 question 14).
4. **CT-01 and CT-02: editorial checks.** Every `type_answer` question reviewed for near-miss answers to list as `rejected`; aliases that normalize to the same string; ordering questions with ties; options that differ only in case or spacing (needs plain text from `content-blocks`).
5. **FE-04:** key the renderer map by `QuestionType`; send typed text as typed (the engine accepts either decimal separator); a numeric question's `payload.format` selects the keyboard.
6. **V1 languages:** elided articles (l', d'), per-language letter folds, non-ASCII digits. Each is a table or a step in `src/text`, with fixtures.
7. **ENG-03** can reuse the purity lint block by adding its own `files` glob.

## Execution

Recommended: one engineer session runs the tasks in order (they share types and each builds on the last), with a fresh reviewer and `security-review` on the whole branch before the report. The property suites are the gate on each task.
