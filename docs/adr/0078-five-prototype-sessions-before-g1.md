# 0078. Five prototype sessions before G1, not ten to fifteen interviews

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §22 (P0); roadmap §3.3 A13, G1; DS-10 |

## Context

Spec §22 asks for 10 to 15 interviews across the personas in P0. The design gate G1 falls in week 3.

## Decision

At least 5 people across the personas try the clickable daily-loop prototype before G1, and the findings are folded into the screens. More sessions follow on real builds in Phase 2.

## Alternatives considered

| Alternative | Why not |
|---|---|
| 10 to 15 interviews before design sign-off | Five are enough to catch the large usability problems without holding the gate (roadmap §3.3). |
| No sessions before building | Problems would be found after the code is written. The earlier prototype had no design pass at all (roadmap §9). |

## Consequences

- DS-10 writes up the findings; the owner helps find the people.
- Five sessions find large problems, not rare ones. The five should span the personas of spec §4, including a player who relies on a screen reader or large text.
- Later sessions use real builds in Phase 2, and at G2 the owner plays for three consecutive days.
