# 0062. Generated usernames, a blocklist and OpenAI moderation behind our own interface

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | SAFE-03, SOC-04, ONB-07; spec D8, §19.1; roadmap §3.1 (Moderation), §7 |

## Context

Players exchange no free text in the MVP (D8, SOC-04). The one piece of player-written text that other players see is a username, and SAFE-03 requires it to be filtered before anyone else sees it.

## Decision

Every player starts with a generated username. A username a player chooses passes a blocklist and then OpenAI's moderation endpoint, called behind an interface of our own. If the moderation call fails, the username goes to a review queue and isn't shown until it is cleared.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A blocklist alone | It misses variants and other languages, and it blocks innocent words that contain a listed one. |
| AI moderation alone | It adds cost and delay to cases a list settles at once, and an outage would stall every username. |
| A person reviews every username | It delays onboarding and doesn't scale. |

## Consequences

- A failure fails closed: no username is shown unfiltered.
- The moderation call is a network call, so it happens outside any transaction (roadmap §7).
- Username text is sent to OpenAI and nothing else is. The privacy policy has to say so (O-7).
- The interface makes the vendor replaceable (roadmap §9). Images need no moderation at MVP; public content in V2 reopens this.
