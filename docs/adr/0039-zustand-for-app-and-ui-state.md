# 0039. Zustand 5 for app and interface state

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §18.5; roadmap §3.1 (App and UI state) |

## Context

Some state belongs to neither the server nor a session: interface flags, locally mirrored settings, the development scenario switcher. Spec §18.5 gives it its own layer.

## Decision

Client-only app and interface state lives in Zustand 5 stores. Server data stays in TanStack Query (ADR 0038) and the session in XState (ADR 0037).

## Alternatives considered

| Alternative | Why not |
|---|---|
| React context | Every consumer re-renders on any change to the value. |
| Redux Toolkit | More ceremony than this small layer needs. |

## Consequences

- In v5 a selector must return a stable value; use `useShallow` when selecting an object or array.
- Server data is never copied into a store. A value has one home: server, session or interface.
- A store that must survive a restart persists to MMKV (ADR 0040).
