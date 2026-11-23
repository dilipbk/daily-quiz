# 0058. The transactional email service is chosen in BE-16

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | ONB-04; roadmap §3.1 (Email), O-2 |

## Context

The only email the MVP sends is the magic link for sign-in, built in BE-16 (milestone M1). No email service was researched on 2026-11-14, and nothing before BE-16 depends on one.

## Decision

No email service is chosen yet. BE-16 chooses one from the docs current on that day and records it in an ADR.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Choose one now | It would be a guess with no research behind it, and whatever was checked today would be stale by M1. |
| Send from a mail server of our own | Reaching the inbox is the service these providers sell. |

## Consequences

- BE-16 puts sending behind an interface of our own, with a fake for tests, so the provider can change.
- BE-16's ADR states where the provider keeps email addresses, what it costs at the expected volume, and how bounces are handled.
- The owner opens the account once BE-16 names it (O-2). The sending domain needs DNS records.
- Apple and Google sign-in don't wait for this.
