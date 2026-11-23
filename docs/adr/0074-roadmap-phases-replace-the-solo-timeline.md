# 0074. The roadmap's phases replace the spec's solo timeline

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §22; roadmap §2, §5, §3.3 A9 |

## Context

Spec §22 plans a P0 of 3 to 4 weeks and an MVP of 4 to 5 months for one developer. The team has five roles working in parallel, and the plan is ordered differently: design first, then the daily loop end to end, then breadth.

## Decision

The phases and gates of roadmap §5 (G0 to G4, weeks 1 to 21) are the plan. The durations in spec §22 no longer apply. Its scope for MVP, V1, V2 and V3 does.

## Alternatives considered

| Alternative | Why not |
|---|---|
| The spec's sequence: the app first on mocks, the backend later, no design gate | The earlier prototype of this spec never scheduled a design pass and reached 1% of its content target (roadmap §9). |
| One long MVP phase with a gate at the end | Problems of feel and performance would surface last. G2 puts the loop on a low-end device in week 6. |

## Consequences

- The calendar assumes the owner answers review requests within a working day (O-8).
- A gate checks behaviour on devices and in pipelines, not documents.
- A change of scope goes through the roadmap and `docs/traceability.md`, with the owner's approval.
- V1 is planned in detail only after G4. FND-06 updates spec §22.
