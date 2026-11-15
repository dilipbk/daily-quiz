# ENG-03 `game-rules` implementation plan

> **For agentic workers:** this session implements the plan itself, task by task and test-first (`superpowers:executing-plans`, `superpowers:test-driven-development`). Steps use checkboxes for tracking.

**Goal:** fill `packages/game-rules` with the pure functions that decide streak days, freezes, milestones, XP, levels and the daily goal, so the API (authority) and the app (optimistic display) run the same rules.

**Architecture:** a session is credited to the calendar date in its own IANA zone at the moment it completes, and nothing else about it matters. A streak is a replay over the *set* of credited dates up to "today", so arrival order and duplicates cannot change it. Every number the spec marks tunable lives in one `GameRules` object with the spec's defaults.

**Tech stack:** TypeScript ~6.0 strict, Vitest 5 from the root config (ADR 0002), fast-check 4.10.2 for property tests, and runtime built-ins only (`Intl.DateTimeFormat`, `Date.UTC`).

**Spec:** `docs/spec.md` (STK-01, STK-03, STK-04, STK-06, XP-01 to XP-04; PLAY-02, DLY-03, OFF-04 for context), `docs/roadmap.md` §4.3 and §7, and the rulings below.

## Context

ENG-03 is a Phase 0 ticket that BE-06 (completion write path), BE-11 (progress), FE-07 (outbox, optimistic streak, capped offline XP) and FE-12 (progress UI) all build on. Roadmap §7 requires streak and XP logic to live in a shared package and nowhere else. The package is an empty shell today (`packages/game-rules/src/index.ts` exports nothing).

The spec left five rules open, and one of them (the time-zone credit limit) collided with roadmap §4.3 item 4. The ticket went back as `NEEDS GRILLING`; the owner ruled on 2026-11-15 by accepting every recommended option. Those rulings are recorded here and in two ADRs in the same pull request.

## Rulings (owner, 2026-11-15)

| # | Rule | Ruling |
|---|---|---|
| R1 | Time-zone credit limit (STK-03) | **Dropped.** A session counts for the calendar date in the phone's IANA zone at the moment it completes. Frequent zone flips become a plausibility signal for the server later (OFF-04, SEC-05); that is not this ticket. STK-03's limit sentence is superseded by ADR 0003. |
| R2 | Qualifying session (STK-01) | A completed session that is not a Practice replay and is a Global Daily, a Daily 5, or any other source with ≥ 5 questions (quiz, challenge). Score doesn't matter. |
| R3 | Earning freezes (STK-04, STK-06) | Each milestone (3, 7, 14, 30, 50, 100, 365) grants 1. A grant while holding 2 is lost. A new player holds 0. A new streak's milestones grant again. (Badge once ever and celebration each time are BE-11 and FE-12.) |
| R4 | Level curve (XP-02) | Level L to L+1 costs `20 × L` XP; reaching level L takes `20 × L × (L − 1) / 2`. No cap. `20` is the tunable `stepXp`. |
| R5 | Unvalued tunables | Offline XP cap 100 a day (XP-04), applied to the app's optimistic total only. Practice XP: 0 for a replayed daily, 50% rounded down for any other replay (PLAY-02, DLY-03). |

Readings taken with no objection:

1. A freeze covers a missed day as soon as that day is over. Two held cover two days in a row. Freezes spent before a break stay spent. If the missed day's session syncs late, the replay no longer needs the freeze and it is back (forced by roadmap §4.3 item 4).
2. A frozen day keeps the streak alive and doesn't add to the count.
3. The day credited is the local date at completion, not at session start.
4. XP-01: 10 for any completed session, 2 per correct answer, 10 more when every answer is correct. Relaxed earns full XP.
5. The goal ring counts all XP credited to the local day.
6. The milestone list is configuration, defaulting to the spec's values.
7. Best streak is the longest count ever reached and survives a break.

## Global constraints

- **Pure.** Files under `src/` import only each other. No React Native, no `node:` modules, no network, no clock: the instant and the zone arrive as arguments. Enforced twice: `src/` is typechecked with `types: []` and `lib: ES2022` (so `process`, `fetch` and `node:` imports don't compile), and a test scans every import specifier.
- **Hermes-safe.** `src/` uses `Intl.DateTimeFormat.prototype.format` only. Hermes does not document `formatToParts`, `Intl.supportedValuesOf` or `Temporal` (https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md). Tests may use them; they run on Node 26.13.1.
- **Types.** An instant is epoch milliseconds (`number`). A zone is an IANA string. A date is `YYYY-MM-DD` (`LocalDate`), which sorts correctly as a string.
- **Tunables.** Every *(tunable)* value is a field of `GameRules`. Each function takes `rules` as its last parameter, defaulting to `DEFAULT_GAME_RULES`.
- **Bad input fails loudly.** An unknown zone, a non-finite instant, a malformed date, or a count that is negative, fractional or inconsistent throws `RangeError`. Nothing returns `NaN`.
- **Scope.** Only `packages/game-rules/**`, root `package.json` and `pnpm-lock.yaml`, `docs/plans/ENG-03.md`, and `docs/adr/0003` to `0005`. `docs/traceability.md` is not touched: every ENG-03 row has a later ticket, so all stay `todo`.
- **Dependencies.** No runtime dependency. One dev dependency, `fast-check@^4.10.2`, in the root `package.json` beside Vitest.
- **Git.** Branch `feat/ENG-03-game-rules`; conventional commits citing `(ENG-03)`; the noreply address already configured; a pull request, merged by the owner.

## File structure

| File | Responsibility |
|---|---|
| `packages/game-rules/src/local-date.ts` | `LocalDate`, instant + zone → date, calendar arithmetic |
| `packages/game-rules/src/rules.ts` | `GameRules`, `DEFAULT_GAME_RULES`, `SessionSource`, `PlayMode` |
| `packages/game-rules/src/streak.ts` | qualifying sessions, the streak replay, freezes, milestones |
| `packages/game-rules/src/xp.ts` | session XP, the offline cap |
| `packages/game-rules/src/levels.ts` | level curve |
| `packages/game-rules/src/daily-goal.ts` | goal ring |
| `packages/game-rules/src/index.ts` | public exports only |
| `packages/game-rules/tests/*.test.ts` | one file per source file, plus `streak.properties.test.ts` and `purity.test.ts` |
| `packages/game-rules/tests/support/zones.ts` | test-only helpers: every zone the runtime knows, its 2026 offset changes, the first and last instant of a local day |
| `packages/game-rules/tests/tsconfig.json` | typechecks tests with `types: ["node"]`, following `packages/config/tsconfig.json` |
| `packages/game-rules/package.json` | `typecheck` becomes `tsc --noEmit && tsc --noEmit -p tests` |
| `docs/adr/0003-…`, `0004-…`, `0005-…` | R1; R2 to R5 with the readings; local dates from the runtime's `Intl` |

## Public API

```ts
// local-date.ts
type LocalDate = string & { readonly __localDate: never };
parseLocalDate(value: string): LocalDate                 // RangeError unless a real YYYY-MM-DD date
isValidTimeZone(timeZone: string): boolean
localDateOf(instantMs: number, timeZone: string): LocalDate
addDays(date: LocalDate, days: number): LocalDate
daysBetween(from: LocalDate, to: LocalDate): number      // calendar days, to − from

// rules.ts
type SessionSource = 'global_daily' | 'daily_5' | 'quiz' | 'challenge';
type PlayMode = 'standard' | 'relaxed' | 'practice';
interface GameRules {
  streak: { minQuestions: number; milestones: readonly number[]; maxFreezesHeld: number; freezesPerMilestone: number };
  xp: { perSession: number; perCorrectAnswer: number; perfectBonus: number; practiceFactor: number; offlineDailyCap: number };
  levels: { stepXp: number };
  dailyGoal: { casual: number; regular: number; serious: number };
}
DEFAULT_GAME_RULES  // 5, [3,7,14,30,50,100,365], 2, 1 | 10, 2, 10, 0.5, 100 | 20 | 20, 50, 100

// streak.ts
isQualifyingSession(s: { source: SessionSource; mode: PlayMode; questionCount: number }, rules?): boolean
interface Completion { completedAt: number; timeZone: string }
type StreakStatus = 'inactive' | 'lit' | 'at_risk' | 'frozen';
interface StreakState {
  current: number; best: number; freezesHeld: number; status: StreakStatus;
  lastCreditedDate: LocalDate | null;
  frozenDates: readonly LocalDate[];                              // every day a freeze covered, ascending
  milestoneHits: readonly { milestone: number; date: LocalDate }[]; // every milestone reached, across streaks
}
deriveStreak(creditedDates: Iterable<LocalDate>, today: LocalDate, rules?): StreakState
streakFromCompletions(completions: Iterable<Completion>, now: { instant: number; timeZone: string }, rules?): StreakState
nextMilestone(streak: number, rules?): number | null

// xp.ts
sessionXp(s: { source: SessionSource; mode: PlayMode; correctAnswers: number; totalQuestions: number }, rules?): number
cappedPendingXp(pending: Iterable<{ date: LocalDate; xp: number }>, rules?): Map<LocalDate, number>
optimisticXp(validatedXp: number, pending: Iterable<{ date: LocalDate; xp: number }>, rules?): number

// levels.ts
xpToReachLevel(level: number, rules?): number
levelForXp(totalXp: number, rules?): number
levelProgress(totalXp: number, rules?): { level: number; xpIntoLevel: number; xpForLevel: number; fraction: number }
levelsGained(xpBefore: number, xpAfter: number, rules?): number

// daily-goal.ts
type DailyGoalTier = 'casual' | 'regular' | 'serious';
dailyGoalProgress(xpToday: number, tier: DailyGoalTier, rules?): { target: number; earned: number; remaining: number; fraction: number; met: boolean }
```

`status`: `inactive` when `current` is 0; `lit` when today or a later date is credited; `frozen` when today isn't credited and a freeze covered yesterday; otherwise `at_risk`.

## Tasks

### Task 1: Branch, plan, test scaffolding

- [ ] Confirm `git config user.email` is the noreply address; create `feat/ENG-03-game-rules` from `origin/main`.
- [ ] Save this plan as `docs/plans/ENG-03.md`.
- [ ] `pnpm add -Dw fast-check@^4.10.2`.
- [ ] Add `packages/game-rules/tests/tsconfig.json` (`extends` the base, `types: ["node"]`, `include: ["."]`) and change the `typecheck` script.
- [ ] Commit: `docs(game-rules): add the ENG-03 plan (ENG-03)` and `chore(game-rules): add fast-check and a tests tsconfig (ENG-03)`.

### Task 2: Local dates (`local-date.ts`), STK-03

**Produces:** `LocalDate`, `parseLocalDate`, `isValidTimeZone`, `localDateOf`, `addDays`, `daysBetween`.

- [ ] Failing example tests in `tests/local-date.test.ts`:
  - `localDateOf` for `America/New_York` around 2026-03-08 (spring forward): `04:59:59Z` → `2026-03-07`, `05:00:00Z` → `2026-03-08`, and the next midnight 23 h later: `2026-03-09T03:59:59Z` → `2026-03-08`, `04:00:00Z` → `2026-03-09`.
  - Around 2026-11-01 (fall back, a 25 h day): `2026-11-01T04:00:00Z` → `2026-11-01`, `2026-11-02T04:59:59Z` → `2026-11-01`, `05:00:00Z` → `2026-11-02`.
  - `Australia/Lord_Howe` (30-minute DST), `Pacific/Kiritimati` (UTC+14) and `Etc/GMT+12` (UTC−12) at one instant give three different dates.
  - `Mars/Olympus`, `''` → `RangeError`; `isValidTimeZone` false. `NaN` and `Infinity` instants → `RangeError`.
  - `addDays('2024-02-28', 2)` → `2024-03-01`; `daysBetween('2025-12-31', '2026-01-01')` → `1`; `parseLocalDate('2026-02-30')` and `'2026-2-3'` → `RangeError`.
- [ ] Failing property tests:
  - in `UTC`, `localDateOf(t)` equals `new Date(t).toISOString().slice(0, 10)`;
  - in `Etc/GMT+N` and `Etc/GMT-N`, it equals the UTC date of the shifted instant;
  - for every zone the runtime knows and instants in 2015 to 2040, `t1 ≤ t2` implies `localDateOf(t1) ≤ localDateOf(t2)`;
  - `daysBetween(d, addDays(d, n)) === n` and `addDays(addDays(d, n), −n) === d`.
- [ ] Implement. `localDateOf` formats with `new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })`, reads the three digit groups from the result (month, day, year) and pads them. Formatters are memoized per zone string in a `Map` that is cleared when it passes 1,024 entries, so hostile zone spellings can't grow it without bound. `addDays` and `daysBetween` work on `Date.UTC` day numbers, never on 24-hour multiples of an instant.
- [ ] Tests pass; commit `feat(game-rules): resolve an instant to a local date (STK-03, ENG-03)`.

### Task 3: Rules, qualifying sessions and the streak replay (`rules.ts`, `streak.ts`), STK-01, STK-04, STK-06

**Consumes:** Task 2. **Produces:** `GameRules`, `DEFAULT_GAME_RULES`, `SessionSource`, `PlayMode`, `isQualifyingSession`, `deriveStreak`, `nextMilestone`, `StreakState`.

- [ ] Failing example tests in `tests/streak.test.ts`:
  - `isQualifyingSession`: Global Daily and Daily 5 qualify at any length; a 5-question quiz and a 5-question challenge qualify; a 4-question quiz doesn't; any Practice replay doesn't, a replayed daily included.
  - No dates → `{ current: 0, best: 0, freezesHeld: 0, status: 'inactive', lastCreditedDate: null }`.
  - Three consecutive days ending today → `current 3`, `lit`, `freezesHeld 1`, `milestoneHits [{3, day 3}]`.
  - Same three days seen from the next day → `at_risk`, still 3.
  - Days 1 to 3, day 4 missed, day 5 played → `current 4`, `freezesHeld 0`, `frozenDates [day 4]`.
  - Days 1 to 3 seen from day 5 (day 4 missed, day 5 not played yet) → `current 3`, `frozen`.
  - Days 1 to 7 (two freezes held), then two missed days → streak alive with 0 held; a third missed day → `current 0`, `best 7`, `inactive`.
  - One freeze, two missed days → broken, and the freeze is spent.
  - Day 14 reached while holding 2 → still 2.
  - After a break, a new 3-day streak → a second `milestoneHits` entry for 3 and a freeze granted again.
  - A late credit for a frozen day → that date leaves `frozenDates`, the freeze is back, `current` is one higher.
  - `nextMilestone(0)` → 3, `(3)` → 7, `(365)` → `null`.
- [ ] Failing property tests:
  - **model check:** for random date sets, `today` and rules (`maxFreezesHeld` 0 to 3, random milestone subsets), `deriveStreak` equals a naive day-by-day simulation written in the test;
  - invariants: `0 ≤ freezesHeld ≤ maxFreezesHeld`, `best ≥ current`, `current ≤` the number of distinct dates, `frozenDates` never contains a credited date;
  - duplicates and input order of `creditedDates` don't change the result.
- [ ] Implement the replay over sorted, distinct dates:

  ```
  run = 0, best = 0, freezes = 0, prev = none
  for each date d:
    if prev: gap(prev, max(0, min(daysBetween(prev, d), daysBetween(prev, today)) − 1))
    run += 1; best = max(best, run)
    if run is a milestone: record the hit; freezes = min(maxFreezesHeld, freezes + freezesPerMilestone)
    prev = d
  if prev: gap(prev, max(0, daysBetween(prev, today) − 1))

  gap(prev, missed): if missed > 0 and run > 0:
    covered = min(freezes, missed); freezes −= covered; frozenDates gets prev+1 … prev+covered
    if covered < missed: run = 0
  ```

  A day counts as missed only once it is before `today`, so today is never held against the player and a credited date later than `today` (a flight west) is harmless. Gaps are arithmetic, so a player back after years costs nothing.
- [ ] Tests pass; commit `feat(game-rules): derive streaks, freezes and milestones from credited dates (STK-01, STK-04, STK-06, ENG-03)`.

### Task 4: Completions to streak, with the done-when properties (`streak.ts`), STK-03

**Consumes:** Tasks 2 and 3. **Produces:** `Completion`, `streakFromCompletions`.

- [ ] `tests/support/zones.ts`: `allZones` (`Intl.supportedValuesOf('timeZone')`), `offsetChanges2026(zone)` (scan the year a day at a time with `timeZoneName: 'longOffset'`), `dayBounds(date, zone)` (binary search for the first and last millisecond of a local day).
- [ ] Failing tests in `tests/streak.properties.test.ts`:
  - **arrival order (done-when):** for random completions, each with its own zone and instant, every permutation and any duplication gives a deep-equal `StreakState`; and folding them in one at a time, in any order, ends in the same state.
  - **DST (done-when):** for every zone with an offset change in 2026, one session at a random instant on each local day from 3 days before the change to 3 days after gives `current 7` and no frozen date. The first and last millisecond of each day are included as explicit cases.
  - **DST cadence:** in any zone, sessions never more than 20 h apart leave no local date uncredited between the first and the last.
  - **hops (done-when):** a session's credited date is `localDateOf(its instant, its zone)` whatever the other sessions' zones are; the credited set of a group equals the union of each session's own date.
  - **hop examples:** the layover (Los Angeles Mon, London Tue, Tokyo Wed, Tokyo Thu) gives four days; Tokyo then Los Angeles on the same calendar date counts once and doesn't break; `now` in a zone where today is earlier than the last credited date → `lit`, no freeze spent.
- [ ] Implement `streakFromCompletions`: map each completion through `localDateOf`, compute today from `now`, call `deriveStreak`.
- [ ] Tests pass; commit `feat(game-rules): credit each session to its own local date (STK-03, ENG-03)`.

### Task 5: XP and the offline cap (`xp.ts`), XP-01, XP-04

**Consumes:** Task 3's `GameRules`. **Produces:** `sessionXp`, `cappedPendingXp`, `optimisticXp`.

- [ ] Failing tests in `tests/xp.test.ts`:
  - Global Daily, 8 questions: 0 right → 10; 5 right → 20; 8 right → 36. Daily 5 perfect → 30. Relaxed quiz, 10 of 10 → 40.
  - Practice replay of a quiz, 10 of 10 → 20; 3 of 5 (16) → 8; 4 of 5 (18) → 9; Practice replay of either daily → 0.
  - A completed session with 0 questions → 10, no perfect bonus.
  - `correctAnswers > totalQuestions`, negative, fractional or `NaN` → `RangeError`.
  - Property: non-Practice XP is `10 + 2c + (c === n && n > 0 ? 10 : 0)` and never decreases as `c` grows.
  - Cap: pending 60 + 70 on one day → 100; 60 on one day and 70 on the next → 130; `optimisticXp(500, …)` adds the capped sum; an empty list adds 0.
  - Property: each day's capped value is `min(sum, cap)`, and the order of `pending` doesn't matter.
- [ ] Implement; tests pass; commit `feat(game-rules): compute session XP and cap unsynced XP per day (XP-01, XP-04, ENG-03)`.

### Task 6: Levels and the daily goal (`levels.ts`, `daily-goal.ts`), XP-02, XP-03

**Consumes:** Task 3's `GameRules`. **Produces:** `xpToReachLevel`, `levelForXp`, `levelProgress`, `levelsGained`, `DailyGoalTier`, `dailyGoalProgress`.

- [ ] Failing tests in `tests/levels.test.ts`:
  - `xpToReachLevel`: 1 → 0, 2 → 20, 3 → 60, 5 → 200, 10 → 900, 20 → 3,800, 30 → 8,700.
  - `levelForXp`: 0 → 1, 19 → 1, 20 → 2, 59 → 2, 60 → 3, 900 → 10.
  - `levelProgress(30)` → `{ level: 2, xpIntoLevel: 10, xpForLevel: 40, fraction: 0.25 }`.
  - `levelsGained(15, 65)` → 2; `(20, 25)` → 0.
  - Properties, for XP up to 10⁹ and `stepXp` 1 to 1,000: `xpToReachLevel(L) ≤ xp < xpToReachLevel(L + 1)` where `L = levelForXp(xp)`; `levelForXp` never decreases; each level costs more than the one before.
  - Negative, fractional or `NaN` XP, and level < 1 → `RangeError`.
- [ ] Failing tests in `tests/daily-goal.test.ts`: targets 20, 50, 100; `dailyGoalProgress(10, 'casual')` → `{ target: 20, earned: 10, remaining: 10, fraction: 0.5, met: false }`; 20 → met, fraction 1; 250 on `serious` → fraction 1, remaining 0.
- [ ] Implement. `levelForXp` uses the closed form `floor((1 + sqrt(1 + 8·xp/stepXp)) / 2)` and then steps up or down until the bracket holds, so floating point can't put a player in the wrong level.
- [ ] Tests pass; commit `feat(game-rules): add the level curve and the daily goal (XP-02, XP-03, ENG-03)`.

### Task 7: Public surface, purity guard, ADRs

- [ ] `src/index.ts` re-exports the API above and nothing else.
- [ ] `tests/purity.test.ts`: every `import`/`export … from` specifier in `src/**/*.ts` starts with `./`; no file under `src/` contains `Date.now(`, `new Date()`, `Temporal`, `formatToParts` or `supportedValuesOf`.
- [ ] Review-focus tests (below) added to their owning test files.
- [ ] ADRs from `docs/adr/0000-template.md`, status `Proposed`:
  - `0003-streak-days-are-credited-without-a-time-zone-limit.md` (R1; supersedes STK-03's limit sentence; names the plausibility signal as the follow-up).
  - `0004-game-rules-the-spec-left-open.md` (R2 to R5 and readings 1 to 7).
  - `0005-local-dates-come-from-the-runtime-intl.md` (against bundling a time-zone database; the Hermes limits; the server is authoritative when a phone's zone data is stale).
- [ ] Commit `feat(game-rules): export the public API and guard its purity (ENG-03)` and `docs(adr): record the ENG-03 rulings (ENG-03)`.

### Task 8: Verify, review, pull request, report

- [ ] `pnpm verify` green; keep the output.
- [ ] Re-read the whole diff for names, dead code and anything outside scope.
- [ ] Rebase on `origin/main`; if `pnpm-lock.yaml` conflicts, regenerate it with `pnpm install`.
- [ ] Push; open the pull request (title `feat(game-rules): streak, XP, level and daily-goal rules (ENG-03)`, body citing the requirement IDs and the rulings); bind it and read its CI.
- [ ] Report in the team guide's format.

## Review focus

Inputs the spec is silent on and a player or a caller will still produce. Each gets a test in the file named.

1. **A zone string the runtime doesn't know** (`Mars/Olympus`, an empty string): `RangeError`, never a silently wrong date. `tests/local-date.test.ts`.
2. **A credited date later than today** (the player flew west, or `now` comes from a zone behind the last session's): the streak is `lit`, no freeze is spent, nothing is negative. `tests/streak.properties.test.ts`.
3. **A player back after years:** a 10,000-day gap returns at once with `current 0`, `best` kept and at most `maxFreezesHeld` frozen dates. `tests/streak.test.ts`.
4. **Tunables at their edges from remote config:** `maxFreezesHeld: 0`, an empty milestone list, `practiceFactor` 0 and 1, `offlineDailyCap: 0`, `stepXp: 1` all give sane results. `tests/streak.test.ts`, `tests/xp.test.ts`, `tests/levels.test.ts`.
5. **Numbers that aren't counts** (`NaN`, negative, fractional, more correct answers than questions): `RangeError`, so no `NaN` reaches an XP ledger. `tests/xp.test.ts`, `tests/levels.test.ts`.

## How each done-when line is proven

| Done-when | Proof |
|---|---|
| Property tests cover DST changes | `streak.properties.test.ts`: a session on every local day across each zone's 2026 offset changes keeps the streak; the 20-hour cadence property; the New York and Lord Howe fixtures in `local-date.test.ts` |
| Property tests cover time-zone hops | `streak.properties.test.ts`: each session is credited to its own local date whatever zones the others used; the layover and same-date examples |
| Arrival order can't change a streak | `streak.properties.test.ts`: every permutation, duplication and one-at-a-time fold gives the same `StreakState` |
| `pnpm verify` is green | Command output in the report and the `verify` check on the pull request |
| Pure TypeScript; time and zone as arguments | `purity.test.ts`, and `src/` typechecked with `types: []` |

Edge cases walked before the report: empty input, bad input, duplicates and retries, out-of-order arrival, time zones and DST. Offline, slow, largest text, screen reader and Reduce Motion don't apply to a pure package.

## Not provable in this ticket

- **Hermes.** These tests run on Node. That `Intl.DateTimeFormat.prototype.format` gives the same digits on iOS and Android Hermes is documented but not exercised here. The report proposes a small on-device check (FND-05 or FE-07): `new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Kiritimati', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(0))` should be `01/01/1970`.
- **ADR numbers.** 0003 to 0005 are the next free numbers on `main` today. If FND-03's ADRs merge first, they are renumbered at rebase.

## Proposed tickets (for the report)

- The Hermes check above.
- FND-06: fold R1 to R5 into spec v1.1 (STK-01, STK-03, STK-04, XP-02, XP-04, PLAY-02).
- A zone-flip plausibility signal on the server, with BE-06's plausibility v0 or after it.
- ENG-04: reuse `SessionSource` and `PlayMode` from this package in `contracts`, or agree the names.

## As built (2026-11-15)

The plan was approved by the owner and built as written, with these differences:

- Source and test files import each other with `.ts` extensions, and the package's two tsconfigs set `allowImportingTsExtensions`. Node's type stripping needs the extension; Vite and Metro accept it.
- `src/validate.ts` holds the one shared input check (`assertCount`). It is internal and not exported.
- Two test files were added: `tests/rules.test.ts` pins `DEFAULT_GAME_RULES` to the rulings, and `tests/index.test.ts` pins the exported names.
- `offsetChanges2026` in `tests/support/zones.ts` is a function that scans on first use, so test files that only need the zone list don't pay for the scan.
- `levelsGained` returns 0 when the XP total falls, as when the server's total replaces a higher optimistic one.
- A daily-goal target of 0 from remote config counts as met.
- The fast-check commit is scoped `chore(repo)`, and the tests tsconfig went in with the first feature commit so every commit typechecks.
