# 0041. A thin API client, driven by the contracts registry, that validates every response

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §18.2, §19.2, SEC-06; roadmap §2 rule 4, §3.1 (API client), §3.3 A7 |

## Context

Spec §18.2 offered Hono's `hc` client or a thin fetch wrapper that parses with zod. App binaries stay on phones for months after the server has moved on, so compile-time types can't tell an old app that a response has changed. Every endpoint is a zod schema in `packages/contracts`, listed in an endpoint registry (ENG-04).

## Decision

The app calls the API through one thin client built from the `contracts` endpoint registry. It parses every response with the endpoint's schema at run time and handles timeouts, backoff and 429 in one place. `hc` is used only by the admin console, which deploys together with the API. This settles the choice spec §18.2 left open (amendment A7).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Hono's `hc` in the app | It agrees with the server at compile time only, and the binary in a player's hand was compiled against an older server. |
| A client generated from the OpenAPI document | A second generator and generated code to keep in step, when the zod registry is already the source. |
| A fetch call written per feature | Each one would repeat validation, retries and auth. |

## Consequences

- A response that fails its schema is a handled error with a stable code, never a crash.
- ENG-04 decides how a schema treats a field or enum value an older app doesn't know. `minAppVersion` in `/config` is the last resort when a contract can't stay compatible.
- The fake server plugs in at this client's transport (ADR 0042), and FE-05 runs one suite against the fake and the real API.
