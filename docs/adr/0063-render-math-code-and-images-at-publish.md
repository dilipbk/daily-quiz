# 0063. Math, code and images are rendered when content is published

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §11.3, §15.2; roadmap §3.1 (Publish-time rendering); BE-04 |

## Context

Spec §11.3 has math rendered to SVG on the server when a question is published (MathJax, with `mhchem` for chemistry) and code tokenized at the same moment. Content never changes after it is published, and the app's startup and bundle budgets leave no room for a TeX engine or a syntax highlighter.

## Decision

At publish the API renders `math` blocks to SVG with MathJax, tokenizes `code` blocks with Shiki, and generates image variants with `sharp`. Published content carries the results, and the app renders no source.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Render math on the device | A web view for each formula is slow and sizes inconsistently. The spec allows KaTeX only in the editor's live preview. |
| Highlight code on the device | It ships grammars in the bundle. |
| Render when a request arrives | Repeated work on a hot path, for content that never changes. |

## Consequences

- Published blocks need a schema of their own, because an authored `math` block refuses an `svg` key (ADR 0008). ENG-04 defines it.
- The rendered output is part of a content version. Upgrading MathJax or Shiki affects only what is published afterwards.
- The device renders only SVG the API produced, never SVG an author supplied.
- Open point: what a screen reader reads for a math block. BE-04 and FE-04 settle it before a math question is published.
