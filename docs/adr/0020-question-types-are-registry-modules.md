# 0020. Question types are modules in a registry, and the engine core names no type

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-16 |
| **Ticket** | `ENG-02` |
| **Requirements** | QT-01, QT-02; spec §7.4, §10.1; roadmap §4.3 and the ENG-02 done-when ("a sixth type would touch no engine code") |

## Context

QT-01 asks that each question type be a registry module and that adding a type need no change to the session engine. The MVP has five types, and spec §7.4 lists more for V1, `multi_select` first.

The same grading code runs in two places: on the device, and on the server, which re-grades every completion against the session's snapshot (roadmap §4.3). `contracts` (ENG-04), the app's renderers (FE-04), the content tools (CT-02) and the admin console (CMS-01) all need the list of types and their schemas, and none of them may restate what a type is.

## Decision

A question type is one module: a `type` id, a time class, three zod schemas (`payload`, safe to show a player; `key`, the answer; `response`, what a player submits), an optional schema for its tunables, an optional `check` for rules across fields, and a pure `grade` function. `createRegistry(modules)` derives everything that spans types from the list alone, and `src/core` works from that contract and names no type.

1. **The registry derives; nobody restates.** The question, player-question and answer schemas are strict unions told apart by `type`. The tunables schema, the TypeScript unions (`QuestionOf`, `AnswerOf`, `TunablesOf`) and the lookup that grading dispatches on come from the same list.
2. **The engine's question is the triple `{ type, payload, key }`.** The rest of the Question entity (spec §11.1) belongs to `contracts` and the API. Locale, difficulty multiplier and Standard limit reach the engine as arguments.
3. **Tunables are passed on every call**, as `gradeAnswer(registry, question, answer, { locale, tunables })`. A module is a constant that captures no configuration.
4. **Scoring reads a `Grade`, never a type.** A grade is a status and a `credit` from 0 to 1, so a V1 type can scale its points without a change to scoring.
5. **The Standard time limit comes from a module's time class** (`choice` or `constructed`), not from a table keyed by type (reading R1, ADR 0021).
6. **Grading is total.** A type the registry doesn't hold, an answer tagged for another type and an answer that doesn't parse each grade `invalid` with a reason. Nothing throws for a question the registry's schema accepts.
7. **The core is closed.** `src/core` (grading, scoring, timing, session evaluation, the fixture runner) imports nothing from `src/types`, `src/text` or `src/fixtures`.
8. **The catalogue is a list.** `mvpQuestionTypes` in `src/types/index.ts` holds the five modules. A sixth type is a file in `src/types`, one entry in that list, a fixture file and one entry in the fixture list.

Three things hold this in place: lint (import direction and purity, in `eslint.config.js`), `tests/node/boundaries.test.ts`, and `tests/sixth-type.test.ts`, which registers a `multi_select` module written against the public API and runs it through validation, grading, scoring, the fixture runner and every generic property.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A `switch` on `type` in the grader and in each schema | Every new type edits the core in several places, which QT-01 forbids, and a missed case shows up at run time. |
| One class per type, inheriting from a base question | Instances don't survive JSON, a class invites state into a grader, and it hides the data shapes that `contracts` and the content tools need as schemas. |
| Configuration captured when a module is built, as `createTypeAnswer(tunables)` | Remote config changes while sessions run, and a session is graded with the values it started with (roadmap §7). The server would hold one registry per config version. |
| A global registry that modules add themselves to | What exists would depend on import order, the registry would be module state, and the unions couldn't be derived by the type checker. |
| Renderer, editor form and accessibility behaviour in the same module, as QT-01 lists them | The server runs the engine, so the engine can't import React Native. The app and the admin console each keep a map keyed by the engine's `QuestionType`. |

## Consequences

- FE-04 keeps its renderers in a map typed `satisfies Record<QuestionType, …>`, so a type with no renderer fails the build. CMS-01 does the same for editor forms.
- ENG-04 embeds `mvpRegistry.questionSchema`, `playerQuestionSchema`, `answerSchema` and `tunablesSchema` and doesn't restate them.
- An app older than the server grades a type it doesn't hold as `invalid` with the reason `unknown_type`. What the player then sees is for FE-03 and BE-06 to decide.
- A module's author must keep `grade` pure and total over whatever its schemas accept. `tests/support/registry-properties.ts` checks that for any type that supplies a kit.
- `AnyQuestionTypeModule` uses `any`, in one place and on purpose: a grader takes its own payload and key, so no real module is assignable to one that takes `unknown`.
- Revisit this if a type needs what the contract can't express: a grade that depends on another question, on data only the server holds, or on a call that isn't synchronous.
