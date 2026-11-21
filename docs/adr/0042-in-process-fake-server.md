# 0042. An in-process fake server at the client's transport, not MSW

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §18.2, §19.6; roadmap §3.1 (Mocks), §3.3 A4 |

## Context

The spec planned MSW handlers generated from the contracts, with a scenario switcher (§19.6). The roadmap records, on 2026-11-14, that MSW has no working React Native path. The evidence for that wasn't kept, so check it again before reopening this. The same scenarios are needed in tests, in the gallery and in a development build on a device.

## Decision

`packages/contracts` ships a fake server: plain functions that answer the registry's endpoints from fixtures and scenarios. It is injected at the client's transport and runs inside the app's own process, and tests use the same one. This replaces MSW (amendment A4).

## Alternatives considered

| Alternative | Why not |
|---|---|
| MSW, as the spec says | No working React Native path, as recorded above. |
| A mock HTTP server run as its own process | A device or an EAS build can't reach it without extra network setup, and it is a second thing to start. |
| Module mocks written per test | Each test invents its own responses, and the running app gets nothing. |

## Consequences

- Fake responses are parsed with the real schemas, so a fixture can't drift from the contract.
- The fake skips HTTP itself. Status codes, `ETag`, `Retry-After` and timeouts are proven against the real API in FE-05.
- A production build must not be able to switch the fake on; FE-05 proves it.
