# 0037. XState 5 for the session machine, behind our own versioned persistence adapter

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §10.2, §10.6, §18.5, PLAY-07; roadmap §3.1 (Session state) |

## Context

Spec §10.2 defines the quiz session as a state machine with named states and transitions, and §10.6 requires a session to survive the app being killed. Saved snapshots stay on devices across app updates. FND-05 resolved xstate 5.33.4. XState 6 is in beta and changes persistence (roadmap, 2026-11-14).

## Decision

Each session is one XState 5 machine. Its snapshot is saved and restored only through our own adapter, which stamps a version on what it writes and migrates or discards anything older.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A hand-written reducer | It would re-implement the spec's state table, with its timers and guards, and nothing would check that a transition is legal. |
| XState 6 | It is a beta, and its persistence format is still changing. |
| A Zustand store for the session | Transitions become implicit, and states the spec forbids become representable. |

## Consequences

- Create machines at module scope. Under React Compiler a machine created inside a component loops re-renders on v5; the fix exists only in the 6.0 beta.
- The stored shape is ours, so a later move to XState 6 doesn't strand a session in progress. The adapter carries a test that restores an older version.
- The machine owns the deadline and the UI thread draws it (spec §10.3). Grading stays in `quiz-engine`.
- Revisit when XState 6 is stable, in an upgrade window (roadmap §9).
