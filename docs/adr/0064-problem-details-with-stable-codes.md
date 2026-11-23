# 0064. RFC 9457 problem details with stable codes, from one error handler

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §19.2; roadmap §3.1 (Errors); BE-01 |

## Context

App binaries lag the server, so the app can't depend on an error's wording. It needs a machine-readable code that never changes, and it writes the message itself, in the player's language (spec §19.2).

## Decision

Every error response is an RFC 9457 problem-details document that carries a stable `code` from the registry in `packages/contracts`. One error handler in the API produces them all.

## Alternatives considered

| Alternative | Why not |
|---|---|
| An error body shaped per route | The app would end up matching on English sentences. |
| The HTTP status alone | Too coarse: one status covers many causes. |
| Errors inside a 200 response | It breaks caching and plain HTTP behaviour, such as a 429 with `Retry-After`. |

## Consequences

- A code, once shipped, is never renamed or reused. An app that meets a code it doesn't know shows a generic message.
- Error codes are part of the contract and of the OpenAPI document (ENG-04).
- The handler adds the request id and never returns internals or personal data.
- Every 429 carries `Retry-After` (roadmap §7).
