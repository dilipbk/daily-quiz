# 0022. Published forms of content travel beside the blocks, and their schema lives in `contracts`

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-21 |
| **Ticket** | `ENG-04` |
| **Requirements** | Spec §11.1, §11.3, §10.1, §10.7, SEC-08, QT-04; ADR 0008 (its second consequence); ADR 0020 |

## Context

Spec §11.3 says a math block is rendered to SVG and a code block is tokenized when a question is published, and that an image or audio block refers to a media asset. ADR 0008 defined the blocks an author writes and left the published forms to a later ticket. An authored math block refuses an `svg` key.

Three facts shaped the answer:

- The engine's payload schemas hold authored blocks, strictly (ADR 0020), and the PM ruled that a player-facing question parses with the engine's player-question schema. The server grades a completion against the session's snapshot with the same engine, and the engine compares content structurally.
- An image block holds an asset id and nothing else. A device needs something beside the blocks to find a file, whatever is decided for math and code.
- Rendered math is markup. On a phone an SVG renderer draws it; on the web it could be placed in a page, where markup can run.

The first version of the SVG check refused a list of dangerous patterns. An automated review of each commit then found three ways past successive versions: a slash in place of the space before an event handler, an attribute value read as markup inside `<title>`, and a no-break space that a browser doesn't count as white space. Each was real.

## Decision

1. **The schema lives in `packages/contracts`** (`src/published.ts`, `src/svg.ts`). A published form is produced by the server and read by a device. Nobody authors one.
2. **Renderings travel beside the blocks, never inside them:** `renderings: { media, math, code }`. A block finds its rendering by value: a media block by its asset id, a math block by its LaTeX, a code block by its language and source. `assetOf`, `mathRenderingOf`, `codeRenderingOf` and `unrenderedBlocks` are the one implementation of that match.
3. **A session question carries two sets.** One covers the prompt and the payload; the explanation holds its own. The keyless view (`playerQuestionItemSchema`, strict, built by `toPlayerQuestionItem`) leaves the explanation and its renderings behind, because an explanation's formula can give the answer away.
4. **A media asset is files to fetch:** sources with an https address, a format and a size, the image's own dimensions and a placeholder. It carries no alt text or transcript. The block does (ADR 0008), so there is one place to read them from.
5. **Rendered math is `{ latex, svg, widthEx, heightEx }`, and the SVG is held to a small grammar written as an allowlist:**
   - fifteen elements (shapes, groups, text, `title`, `desc`) and a fixed list of attributes, plus any `data-` attribute;
   - every `<` and `>` in the string delimits a tag, so neither appears in text or in a value;
   - every value is quoted, white space is a space, a tab, a line feed or a carriage return, and an attribute appears once;
   - `href` is `#id` only, `style` is plain declarations with no brackets, and no value holds `url(`;
   - `title` and `desc` hold text only;
   - an attribute value holds no character reference but the five XML names;
   - at most 200,000 UTF-16 units.

   It is a grammar in plain string code and not an XML parser, for ADR 0008's reason: a parser forgives what it reads.
6. **Tokenized code is lines of `{ text, kind }`** whose texts, joined line by line, must equal the source. A kind is a word. `codeTokenKinds` lists the eleven the app colours, and a kind the app doesn't know is drawn as `plain`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A second block union with `svg` and `tokens` inside the block | The engine's strict payloads would refuse it, the snapshot would no longer be the stored question, and every question type would need a second payload schema. |
| Put the schema in `content-blocks` | That package is the authored model, stored for years and imported by the engine. A wire shape belongs where the endpoints are, and the choice would have changed a package still in review. |
| Match a rendering to its block by position | Every reader would have to walk a question the same way, and where a payload keeps its blocks is the engine's to say, per type. |
| Serve each formula as an image file | One more request per formula and a larger prefetch. It stays open: §11.1 lists `svg` as a media kind. |
| A list of forbidden patterns | Three bypasses in three reviews. A list of what is allowed fails closed. |
| An XML parser or a sanitizer library | A dependency that must run on Hermes, and a parser accepts strings that a browser then reads differently. |
| Colours in the tokens, as Shiki emits them | The app has light, dark and high-contrast themes; a kind lets the design tokens choose. |

## Consequences

- **BE-04** produces the renderings and can gate a publish on `unrenderedBlocks` for each piece of content. MathJax's `html` extension stays off. Its output must fit the grammar: a `<` inside a `data-latex` value is written `&lt;`. If MathJax emits an element or attribute the lists lack, the lists change in a pull request; the rule about `<` and `>` does not.
- **FE-04** draws math with the SVG renderer, or as an image on the web, and never inserts the markup into a page as HTML. The grammar is the second line of defence, not the first. A block with no rendering needs a fallback, because the wire schema can't promise one (next point).
- **Coverage is not enforced on the wire.** `contracts` can't walk a payload without naming question types, which ADR 0020 forbids. Proposed: the engine exposes the blocks of a question per type, and the session-question schema then requires a rendering for each.
- **The grammar errs on the strict side.** A formula whose markup spells something outside it is refused at publish, where an author sees it, and never on a device.
- **Math has no spoken form.** No requirement names one today. A ruling is needed before FE-04's screen-reader work: MathJax can emit speech text, which would be one more field.
- For the wire, this answers ADR 0008's open question about `alt`: the block's is the one a device reads.
- Revisit if content needs inline math, or once BE-04 has run real MathJax output through the grammar.
