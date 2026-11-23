# 0059. Cloudflare R2 for media, with image variants generated at publish

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §11.1, §15.2, §19.1; roadmap §3.1 (Media), §7 (150 KB) |

## Context

Spec §19.1 asks for object storage behind a CDN, and the CDN is Cloudflare (ADR 0060). A question image may weigh at most 150 KB at device width, and that limit is a publish gate (roadmap §7).

## Decision

Media is stored in Cloudflare R2. At publish the API generates AVIF and WebP variants at device widths and stores them under immutable URLs. An image whose variant is over 150 KB can't be published.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Another object store with its own CDN | A second vendor and egress fees, when the CDN is already Cloudflare. |
| An image service that resizes on request | The size limit couldn't be a gate before a player sees the image, and the first request pays for the work. |
| Media in Postgres | It bloats the database and every backup. |

## Consequences

- R2 speaks the S3 API, so the store is replaceable.
- A variant never changes. A new image is a new asset version (spec §11.2).
- Authors must supply images large enough for the widest variant; `sharp` does the resizing (ADR 0063).
- The weekly database dump also goes to R2 (roadmap §7).
