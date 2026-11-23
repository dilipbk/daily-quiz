# 0060. Cloudflare in front: CDN, WAF and per-IP rate limits

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Roadmap §3.1 (Edge), §4.1, §4.3, §7 (Caching; Security and privacy) |

## Context

The Global Daily body is the same for everyone on a date, so it should be built once and served from a cache (roadmap §4.3). Guest creation is the endpoint most open to abuse, and it has to be limited before a request reaches application code.

## Decision

All traffic to the API, the media and the web pages passes through Cloudflare, which provides the CDN, the WAF and per-IP rate limits.

## Alternatives considered

| Alternative | Why not |
|---|---|
| No edge: the API serves everything | Every fetch of the daily would reach the machines, and nothing would limit an IP ahead of our code. |
| Another CDN | Workable. Cloudflare also holds R2 and the domain, so it is one account. |

## Consequences

- Nothing personal is cached at the edge. Per-player responses are `private`, and a test asserts the header (roadmap §7).
- Versioned content is served under immutable URLs with an ETag equal to its version.
- The API must accept traffic only through Cloudflare, or the per-IP limits can be bypassed; BE-01 and FND-07 arrange it.
- The domain's DNS sits with Cloudflare (O-2).
