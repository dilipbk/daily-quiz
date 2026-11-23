# 0067. Web pages are Expo Router routes with server output, on EAS Hosting

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec D3, Appendix B, WEB-01, WEB-03, QT-05, A11Y-11; roadmap §3.1 (Web share, landing and legal pages), §3.2 |

## Context

Spec D3 limits the web to share pages and marketing, built from the same Expo codebase, with no separate web app (Appendix B). A share page needs Open Graph tags for its own challenge. Question types must work on the web (QT-05, A11Y-11), and V1 adds play in the browser.

## Decision

The share, landing and legal pages are Expo Router routes, built with server output and deployed to EAS Hosting. Open Graph tags come from `generateMetadata()`, and the API renders the share images.

## Alternatives considered

| Alternative | Why not |
|---|---|
| HTML rendered by the API | Simpler today, but question types must work on the web and V1 adds in-browser play, so web support has to be honest from the start (roadmap §3.2). |
| A separate Next.js app | A second codebase and a second set of components (spec Appendix B). |
| A static export | Open Graph tags for each challenge need rendering per request. |

## Consequences

- SDK 58's server output renders on each request and prerenders nothing, so the landing and legal pages rely on the CDN.
- The web build runs in CI from FE-01. Native-only libraries need web-safe paths (ADR 0033, 0035, 0040).
- Only a local export and serve are proven (ADR 0006). EAS Hosting and `generateMetadata()` are unproven until WB-01.
- The admin console's player preview is this web build in a frame (ADR 0068).
