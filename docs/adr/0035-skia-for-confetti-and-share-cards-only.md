# 0035. Skia for confetti and share cards only; the timer ring is SVG

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §12.5, §15.2, §18.2, DLY-05; roadmap §3.1 (Graphics), §3.3 A8, §7 (startup) |

## Context

Spec §18.2 had Skia draw the timer ring. The ring is on screen in every timed question, so Skia would sit on the path to the first question, which must appear within 30 s of first launch (ONB-01) and inside the cold-start budget (spec §15.2). Skia is a large library: its web build alone needs an 8 MB `canvaskit.wasm`. Confetti and share cards appear only after a session ends.

## Decision

The timer ring and bar are `react-native-svg` shapes animated by Reanimated. Skia draws confetti and share cards only, and only those screens import it. This replaces the Skia timer ring of spec §18.2 (amendment A8).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Skia for the ring, as the spec says | A startup cost on the way to every first question, for an arc that an SVG path can draw. |
| No Skia at all | Kept in reserve. Many particles at a steady frame rate and an image rendered at a fixed size are the two jobs Skia is here for; both have plainer substitutes if it proves costly to keep building. |

## Consequences

- "Loaded lazily" means the JavaScript import and the first canvas are deferred. The native library is linked into the binary either way, and no native loading step is documented. QA-01 measures startup to confirm the saving.
- `@shopify/react-native-skia` 2.14.0 is the last release under that name; later ones are published as `react-native-skia`. 2.14.0 builds locally on both platforms and on web, but its Android build is reported to run out of memory on EAS medium workers. FND-05b settles it; the fallback is `react-native-skia@2` (ADR 0006).
- The web share pages must not import Skia.
- Revisit if profiling on the low-end Android device shows the SVG ring dropping frames.
