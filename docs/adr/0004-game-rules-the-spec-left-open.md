# 0004. Game rules the spec left open

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `ENG-03` |
| **Requirements** | STK-01, STK-04, STK-06, XP-01, XP-02, XP-03, XP-04, PLAY-02, DLY-03, roadmap §4.3 item 4 |

## Context

`packages/game-rules` has to turn the streak and XP requirements into functions, and several of them stop short of a rule:

- STK-01 doesn't say whether a Practice replay or an async challenge extends a streak.
- STK-04 says freezes are "earned at milestones" and gives no count, no behaviour at the cap of two, no starting stock and no rule for a milestone reached a second time. It says a freeze is "applied automatically on a missed day" and nothing about a session for that day that syncs late.
- XP-02 says "an increasing XP curve" and gives no formula.
- XP-04 gives no value for the offline cap.
- PLAY-02 says Practice earns reduced XP and gives no factor; DLY-03 says a replayed daily earns none.

The ticket went back as `NEEDS GRILLING`. The owner ruled on 2026-11-15 by accepting the recommended option for each.

## Decision

| Rule | Decision | Tunable in `GameRules` |
|---|---|---|
| Qualifying session (STK-01) | A completed session that is not a Practice replay and is a Global Daily, a Daily 5, or any other source with five or more questions, challenges included. The score doesn't matter. | `streak.minQuestions` = 5 |
| Earning freezes (STK-04, STK-06) | Each milestone grants one. A grant while holding the maximum is lost. A new player holds none. After a break, the new streak's milestones grant again. | `streak.milestones`, `streak.freezesPerMilestone` = 1, `streak.maxFreezesHeld` = 2 |
| Spending freezes (STK-04) | A freeze covers a missed day as soon as that day is over; two held cover two days in a row; freezes spent before a break stay spent. If the missed day's session syncs later, the freeze is back. | |
| Frozen days (STK-01) | A frozen day keeps the streak alive and doesn't add to its count. | |
| Day credited (STK-03, OFF-04) | The local date at the moment of completion, not at the session's start. | |
| Best streak | The longest count ever reached. It survives a break. | |
| Level curve (XP-02) | Going from level L to L+1 costs `stepXp × L`. Reaching level L takes `stepXp × L × (L − 1) / 2`. No top level. | `levels.stepXp` = 20 |
| Session XP (XP-01) | 10 for any completed session of any source, 2 per correct answer, 10 more when every answer is correct. Relaxed earns the same. | `xp.perSession`, `xp.perCorrectAnswer`, `xp.perfectBonus` |
| Practice XP (PLAY-02, DLY-03) | A replayed daily earns 0. Any other Practice replay earns half the formula, rounded down. | `xp.practiceFactor` = 0.5 |
| Offline cap (XP-04) | XP from sessions still in the outbox adds at most 100 to a local day in the app's optimistic total. The server's total replaces it once they are validated. | `xp.offlineDailyCap` = 100 |
| Goal ring (XP-03) | Counts all XP credited to the local day, whatever mode earned it. | `dailyGoal.casual`, `.regular`, `.serious` = 20, 50, 100 |

With a step of 20, level 2 arrives at 20 XP (a first Global Daily with five right), level 5 at 200, level 10 at 900 and level 20 at 3,800.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A Practice replay of five or more questions extends a streak | A player could keep a streak by replaying one quiz every day. Practice still earns XP toward the goal ring. |
| A freeze, once spent, is never returned | The streak would depend on whether the missed day's session arrived before or after midnight. Roadmap §4.3 item 4 requires late arrivals to converge. |
| Milestones grant a freeze once in a lifetime | A player whose streak broke after day 100 would earn no freeze until day 365. |
| A level step of 50 | Level 2 would take two or three sessions and level 10 about 45 days at 50 XP a day. The first level-up is worth having in the first session. |
| An offline cap below the Serious goal | A player on the Serious goal couldn't complete the ring on a day spent offline. |

## Consequences

- The defaults live in `DEFAULT_GAME_RULES` and a test pins them to this table. Remote config can change any of them without a release; a running session keeps the values it started with.
- Because freezes and milestones are replayed from the set of credited dates, BE-11 must award a milestone's badge by a unique key and not by counting events: a late sync can move the date a milestone was reached.
- After day 100 the next free freeze is at day 365. A long-streak player who spends both has none for most of a year, until V1 adds coins and Premium. If that proves harsh in beta, an extra grant every 30 streak days is one more tunable.
- FND-06 folds this table into spec v1.1.
