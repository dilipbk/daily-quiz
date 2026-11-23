# 0075. This repository starts its own ADR series

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Roadmap §3.3 A10; FND-06 |

## Context

The spec cites ADR 0008 to 0012 throughout. Those records belong to an earlier codebase, none of whose code is used here, and their files aren't in this repository. The behaviours they describe are restated in the spec's text. Meanwhile the same numbers have been issued here for other decisions.

## Decision

ADRs in `docs/adr/` are numbered from 0001 for this repository alone. An ADR number in the spec refers to the earlier series and carries no authority here. FND-06 replaces each with a number from this series or with plain text.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Import the earlier ADRs under their numbers | They describe a codebase that isn't used, and roadmap §3.3 overturns several of them. |
| Start this series at a higher number to avoid the clash | Numbers from 0001 were already issued, and the clash ends with FND-06. |

## Consequences

- Until FND-06 lands, "ADR 0009", "ADR 0010" and "ADR 0011" in `docs/spec.md` mean the earlier series: timer ownership, session restore and prefetch. They are not the files in this folder.
- The PM reserves numbers per ticket, because parallel branches collided twice. The register is in `docs/adr/README.md`.
- An accepted ADR is superseded by a new one, never edited to say something new.
