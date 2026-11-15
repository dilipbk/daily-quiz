# 0003. Content blocks are a flat, strict schema, and a link has one canonical https spelling

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `ENG-01` |
| **Requirements** | Spec §11.3, QT-04, SEC-08, A11Y-10; roadmap §7 ("Content renders from structured blocks only") |

## Context

Spec §11.3 names seven blocks and five inline marks. It leaves open where a link lives (SEC-08 requires links; §11.3 lists none), whether a media block carries its own text alternative (§11.1 puts `alt` and `transcript` on MediaAsset; §11.3 says only "a MediaAsset reference"), how deep content may nest, how long it may be, and what exactly counts as an https link.

`packages/content-blocks` is imported by `quiz-engine`, the app's renderer, the API's content store and the content validator, so it runs on Hermes and on Node and may use neither platform's APIs. Content is stored for years: a rule can be loosened later without touching stored content, but tightening one would invalidate it. The PM's instruction for ENG-01 was to take the strict reading wherever the spec is silent. The schema library is zod 4.6.7 (released 2026-10-12, checked 2026-11-15).

## Decision

Content is a non-empty list of blocks, validated by a zod schema with these properties.

1. **Inline content is text spans and links.** A span is `{ type: 'text', text, marks? }` with the five marks of §11.3, each at most once, never subscript with superscript. A link is an inline node, `{ type: 'link', href, children }`, whose children are text spans, so a link can't contain a link.
2. **Flat by construction.** No schema refers to itself. Paragraphs, quotes and list items hold inline content; a list holds items, not lists. Content can't nest deeper than the schema is written.
3. **Strict, and never rewritten.** A key the schema doesn't name is an error. Nothing is trimmed, lowercased or normalized: what passes is what was stored.
4. **One spelling of an https link.** Lowercase `https://`, then a lowercase ASCII domain name of two or more labels, then a path, query and fragment in RFC 3986 characters; 2,048 characters at most. No credentials, port, IP address, `localhost`, whitespace or non-ASCII character (a non-Latin domain is written in its `xn--` form, a non-ASCII path percent-encoded). The check is a grammar in plain string code, not a URL parser.
5. **Media by id, with its text alternative on the block.** `image` is `{ assetId, alt }` and `audio` is `{ assetId, transcript }`. `assetId` is an id, never a URL or a path; `alt` and `transcript` are required and must hold visible text.
6. **Nothing empty.** An empty list, a block with no text, and text that is only whitespace or invisible characters are errors.
7. **Limits**, counted in Unicode code points and exported as `blockLimits`: 32 blocks; 32 list items; 64 spans in a paragraph, quote, list item or link; 2,000 characters in a span, a LaTeX source or a transcript; 4,000 in a code source; 500 in alt text; 10,000 of text in one list of blocks.
8. **Characters.** Control characters and unpaired surrogates are errors. Code, LaTeX and transcripts keep line feeds and tabs; all other text is one line. Text in any script, emoji and direction marks pass unchanged.
9. **Errors an author can act on.** `validateBlocks` returns every reason as `{ code, message, path, blockIndex, blockType }`. Codes are stable; messages are English.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A link as a mark carrying an `href` | Marks become a mixed list of names and objects, and a link whose text is partly bold becomes two links to a screen reader. |
| Blocks inside blocks: quotes holding paragraphs, nested lists | Unbounded depth to lay out on a phone and to validate, and §11.3 asks for neither. Adding them later is compatible. |
| `z.url()`, `z.httpUrl()` or `new URL()` | They rely on the platform's `URL`, which differs on Hermes; `z.httpUrl()` admits `http:`; and a parser forgives what it reads (letter case, whitespace, backslashes), so the string that was checked isn't the string that gets opened. |
| Normalize instead of refuse: trim, lowercase the scheme | Validation would return content that differs from its input, and every caller would have to store the output. |
| Alt text and transcripts on MediaAsset only | They couldn't be checked without the asset store, and alt text depends on the question: the same image needs different words in two questions. |
| No limits here; leave size to the API | The app and the content pipeline validate too, and a renderer needs a bound it can rely on. |

## Consequences

- FE-04 renders seven blocks and two kinds of inline content, never recursively, and can guard the in-app browser with `isHttpsUrl`.
- BE-04 must decide where the published forms live (SVG for math, tokens for code). An authored `math` block refuses an `svg` key, so published content needs its own schema.
- `alt` now exists on the block and on MediaAsset (§11.1). The block's is the one validated here; BE-04 and FE-04 need a ruling on which is rendered, and FND-06 should say so in spec v1.1.
- Authors must paste links in canonical form. The reason returned says which rule a link broke.
- Messages are English, for authors and tools. A screen shown to players (the creator editor, V1) translates by `code`.
- The limits are first estimates. Revisit them once the first few hundred questions are drafted, and revisit the model if content needs inline math, tables, nested lists or a link with a port.
