# 0003. Streak days are credited without a time-zone limit

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `ENG-03` |
| **Requirements** | STK-03, OFF-04, roadmap §4.3 item 4, roadmap §7 (append-only ledgers) |

## Context

STK-03 says "Time-zone changes are credited at most once per 24 h, to prevent abuse." It doesn't say what happens to a session finished after a second change, or which clock measures the 24 hours.

Roadmap §4.3 item 4 says a streak derives from the set of credited local dates, so late, duplicate and out-of-order arrivals converge. Roadmap §7 wants streak changes as append-only rows with unique natural keys. A limit that depends on earlier zone changes makes the day one session is credited to depend on other sessions, so a session that syncs late can move the day of one already credited.

What the limit buys: at any instant at most three calendar dates are current somewhere on Earth (UTC−12 to UTC+14). With no limit, a player who changes the phone's zone on purpose can cover three dates in one sitting and keep a streak by playing once every 72 hours. With the limit they cover two, once every 48 hours. Either way the cheat pads only the cheater's own flame; streaks feed no ranking (LGE-05 ranks by XP).

What the limit costs: an honest traveller with a layover. Monday in Los Angeles, Tuesday in London (change honoured), Wednesday morning in Tokyo 13 hours later (second change inside 24 hours, so the session is credited to London's date, Tuesday, again), Thursday in Tokyo. The result is Monday, Tuesday, Thursday: a day lost by a player who played on four consecutive calendar days.

The ticket went back as `NEEDS GRILLING`. The owner ruled on 2026-11-15.

## Decision

A qualifying session is credited to the calendar date in the device's IANA time zone at the instant it completes, and to nothing else. There is no limit on time-zone changes. This supersedes the limit sentence of STK-03; the rest of STK-03 stands.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Keep the limit, measured on the sessions' own completion times | It converges, but a late sync can re-date a session already credited, so streak days become a projection to recompute instead of append-only rows. The app would need the streak-zone state from the server to show the same answer. The layover case above happens. |
| Keep the limit, measured in the order the server receives sessions | Two devices syncing in a different order could end with different streaks. That contradicts roadmap §4.3 item 4 and ENG-03's done-when line. |

## Consequences

- Each session's day depends on that session alone. BE-06 can keep one append-only row per player and local date, and arrival order can't change a streak. `streakFromCompletions` in `packages/game-rules` has property tests for both.
- Travel needs no special case. A flight west repeats a calendar date, which counts once. A flight east can skip a calendar date, which a freeze covers like any missed day.
- A calendar day that a zone itself skipped counts as a missed day: a freeze covers it, or the streak ends. Apia had no 30 December 2011, so sessions there on 28, 29 and 31 December and 1 January give a streak of 2. Five such days exist between 1970 and 2040 (Kwajalein 1993-08-21, Enderbury and Kiritimati 1994-12-31, Apia and Fakaofo 2011-12-30), none after 2011.
- A player who changes the phone's zone on purpose can keep a streak on one sitting every 72 hours. Frequent zone changes become a plausibility signal the server can log and act on (OFF-04, SEC-05); that is a later ticket.
- FND-06 folds this into spec v1.1.
- Revisit if a streak ever feeds a ranking or pays out something of value, or if the plausibility signal shows the cheat is common.
