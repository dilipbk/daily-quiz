# 0023. The endpoint registry is data, requests are strict and responses tolerant, and OpenAPI 3.1 comes from zod's own conversion

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-21 |
| **Ticket** | `ENG-04` |
| **Requirements** | Spec §19.2; roadmap §2 rule 4, §3.1 ("API client", "Errors"), §3.3 A7, §7; the ENG-04 done-when |

## Context

Roadmap §3.1 asks for a thin client "driven by the `contracts` endpoint registry that validates every response at runtime", because app binaries lag the server. Roadmap §7 requires an endpoint to exist in `contracts` before either side implements it, BE-01 serves an OpenAPI document, and ENG-04 is done when the registry generates OpenAPI 3.1.

The package is imported by the mobile app, so it can depend on nothing that needs Node or a web framework.

Checked on 2026-11-21 against zod.dev, the zod 4.6.7 source, npm and spec.openapis.org:

- zod 4.6.7 has `z.toJSONSchema()`. Its default target is JSON Schema 2020-12, which is the schema dialect of OpenAPI 3.1. It has no target named for 3.1. Run on this branch, it converts every schema the engine and the block package export.
- `zod-openapi` 6.0.2 wraps that same call. `@asteasolutions/zod-to-openapi` 9.1.0 has its own converter and two runtime dependencies. `@hono/zod-openapi` 1.6.3 and `hono-openapi` 1.6.0 need a Hono app. `zod-to-json-schema` is deprecated.
- OpenAPI 3.1.2 is the latest 3.1 patch. 3.2.1 exists, and `openapi-typescript` and `swagger-parser` don't read 3.2 yet.

## Decision

1. **An endpoint is a plain object:** `id`, `area`, `method`, `path` (with `:name` parameters, as the API's router reads it), `access` (`public`, `player` or `admin`), `params`, `query`, `body`, `idempotencyKey`, `caching`, `success` and the error codes it adds. `endpoints` holds each under its own name, so a caller keeps its types; `endpointList` is the same set for whatever walks them all.
2. **Reading rules.**
   - What a client sends is a strict object: the server refuses a field it doesn't know.
   - What the server answers is a plain object: an app drops a field it doesn't know.
   - Schemas embedded from the engine and the block package stay strict, by their own ADRs.
   - A value that only decides how something looks is a word, not a closed list: a code token's kind, the question types a quiz lists, a problem's `code`.
   - Nothing transforms what it reads and nothing has a default. The one coercion is a number in a query string.
3. **Errors are RFC 9457 problem details** with a `code` from a catalogue of fourteen. A code has one HTTP status. `type` is `/problems/<code>`. The app's schema accepts any snake-case code, so it can read one added after it shipped.
4. **`generateOpenApi()` is a pure function in this package**, behind its own entry point, `@repo/contracts/openapi`. It names each schema, converts them in one `z.toJSONSchema` call (`draft-2020-12`, the input side, `unrepresentable: 'throw'`) so they refer to each other by name, and assembles paths, parameters, headers, security and one response per error status. The document says `openapi: 3.1.2` and carries `x-access` and `x-error-codes`.
5. **Two libraries, for tests only:** `@seriousme/openapi-schema-validator` 2.12.0 checks the document against the standard's own schema, and `ajv` 8.20.0 compiles every component schema and validates every fixture against it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| `zod-openapi` | Sound, and the fallback if the assembler grows. Today it adds a dependency around the call we make directly, and it reads names from `.meta()`, which we can't put on schemas other packages own. |
| `@asteasolutions/zod-to-openapi` | A second converter to trust beside zod's, and two runtime dependencies in a package the app bundles. |
| `@hono/zod-openapi`, `hono-openapi` | Routes are declared on a Hono app. The registry must be importable by the mobile app. |
| A hand-written OpenAPI file as the source | Two sources of truth; types alone don't protect an app that lags the server. |
| Strict responses | Every added field would break every shipped app until it updated. |
| Tolerant requests | A misspelt field would be dropped in silence, and "the same key with a different body" (roadmap §7) would have no clear meaning. |
| OpenAPI 3.2 | Two of the tools most likely to read the document can't yet. |

## Consequences

- BE-01 mounts routes from `endpointList` and serves `generateOpenApi({ endpoints: endpointList, schemas: sharedSchemas, info })`. FE-05's client and fake server read `endpoints`.
- **Adding a field to a response is compatible. Adding a question type, a block type or a tunable is not:** the engine's schemas are strict, so an app that doesn't hold the new one fails to parse the session or the config. The server needs a gate on the app's version, or `minAppVersion` must cover it first. ADR 0020 left what the player sees to FE-03 and BE-06; this is the same decision.
- **The document describes shapes, and the zod schemas remain the contract.** A refinement can't be written in JSON Schema: unique question ids, tokens that spell their source, milestones in order, the SVG grammar. A client generated from the document doesn't check them.
- On the input side zod writes a transform as its input and doesn't refuse it, so the generator can't hold the no-transform rule. The fixtures test does: every fixture must parse and come back unchanged.
- `tests/fixtures.test.ts` holds the reading rules for every fixture, and `tests/endpoints.test.ts` holds the registry's own: unique ids and routes, path names that match the params schema, an access level on every endpoint, no cache on anything per-player.
- Revisit the target when `openapi-typescript` reads 3.2, and the assembler if it starts to need callbacks, links or webhooks.
