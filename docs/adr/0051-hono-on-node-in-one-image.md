# 0051. Hono 4 on Node 26, in one image that runs an API process and a worker process

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D5, §19.1; roadmap §2 rule 6, §3.1 (Framework and runtime), §3.2 |

## Context

Spec D5 and §19.1 assume a TypeScript API on Hono with Postgres. The API needs multi-statement transactions with row locks, with jobs enqueued inside them (roadmap §4.3), and roadmap §2 rule 6 asks for infrastructure the product could leave in a day. The workspace runs on Node 26.13.1 (ADR 0001). Hono 5 is a release candidate (roadmap, 2026-11-14).

## Decision

The API is Hono 4.13 on Node 26 LTS. One container image starts either as the API process or as the worker process.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Fastify | A sound fallback. Hono's web-standard handlers keep the API portable, and the spec already assumes it. |
| Elysia | It ties us to Bun. |
| NestJS | Heavy for a service of this size. |
| tRPC or oRPC | RPC frameworks fight ETag caching, idempotency keys and webhooks. |
| Hono 5 | A release candidate. |
| Separate images for the API and the worker | Two builds to keep at one version, for the same code and schema. |

## Consequences

- Handlers take and return web-standard requests and responses, so the runtime and the host can change.
- The API and the worker always deploy at the same version and scale apart as two process types.
- FND-07 builds the image from ADR 0001's Node version. Keeping Node patched also keeps the image's time-zone data current, which streak dates depend on (ADR 0005).
- Move to Hono 5 in an upgrade window once it is stable (roadmap §9).
