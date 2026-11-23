# 0052. Fly.io, on at least two machines

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §19.1; roadmap §2 rule 6, §3.1 (Hosting), §3.2, §7 (Availability and recovery) |

## Context

The completion write path is one transaction with row locks that also enqueues jobs (roadmap §4.3), so the API needs ordinary long-lived Postgres connections. The target for soft launch is 99.9% monthly availability with deploys that cause no downtime.

## Decision

The API and the worker run as containers on Fly.io, on at least two machines behind health checks, in the region nearest the soft-launch market and the database.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Cloudflare Workers | The write path is a multi-statement transaction with row locks, with jobs enqueued inside it. Workers' pooled connections and queues fit that poorly (roadmap §3.2). |
| A container service on one of the large clouds | Workable, and where we would go if Fly.io failed us, since the image runs anywhere. It is more to set up and operate than a team this size needs. |
| One virtual machine | A single point of failure, and a deploy means downtime. |

## Consequences

- O-5 fixes the region, and the database sits in the same one (ADR 0053).
- The machines hold no state: media is in R2 and jobs are in Postgres. The host is replaceable.
- Merges deploy to staging on their own; production is promoted by hand (FND-07).
- About $20 a month at list prices on 2026-11-14 (roadmap §8).
