# 0005. Local dates come from the runtime's `Intl`, not a bundled time-zone database

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `ENG-03` |
| **Requirements** | STK-03 (local day boundary, DST safe), STK-02, roadmap §7 (shared rules, startup cost) |

## Context

`packages/game-rules` turns an instant and an IANA time zone into a calendar date. The same source runs in the API on Node 26.13.1 and in the app on Hermes (React Native 0.88), so it can only use what both have.

Checked on 2026-11-15:

- Hermes takes its `Intl` from the platform (Android's ICU, iOS's Foundation). Its documentation lists `Intl.DateTimeFormat.prototype.format` and `resolvedOptions` as supported on both platforms. It does not list `DateTimeFormat.prototype.formatToParts`, `Intl.supportedValuesOf` or `Temporal` (https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md).
- Node 26.13.1 has all of those, with 418 zones.

## Decision

`localDateOf` formats the instant with `new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })`, reads the three digit groups from the result and returns `YYYY-MM-DD`. The package has no date or time-zone dependency. Day arithmetic works on calendar dates, never on 24-hour multiples of an instant.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A library that bundles its own time-zone database | Every device and the server would agree exactly, but the database ships in the app bundle, adds to startup, and goes stale until the next release each time a government changes its clocks. |
| A library that reads `Intl` (date-fns-tz, Luxon, a Temporal polyfill) | It reads the same platform data this decision reads, so it adds weight and no accuracy. |
| `Temporal` | Node 26 has it; Hermes doesn't document it. |
| `formatToParts` | Cleaner than reading digits out of a formatted string, but Hermes doesn't document it for dates. |
| The caller passes the local date in | The day boundary is the rule most likely to be got wrong. Roadmap §7 puts streak logic in the shared package and nowhere else. |

## Consequences

- No dependency to keep current, and nothing added to the app bundle.
- A phone with old time-zone data can disagree with the server about a date near midnight after a recent rule change. The server is authoritative (STK-02), so the app's optimistic streak corrects itself on sync.
- **Server zone data older than a phone's (owner: BE-06).** The authority then credits the wrong day for a session in the hour beside local midnight, and nothing corrects it. The gap is real today: at 2026-11-02T07:30Z in `America/Vancouver`, Node 22.14.0 (tzdata 2024b) says 1 November and Node 26.13.1 (tzdata 2026e) says 2 November, and the PM's reviewer counted 7 zones where the two disagree through 2026 and 2027. BE-06 decides how the API's Node, and with it the zone data, is kept current.
- **A zone the server doesn't know (owner: BE-06).** `localDateOf` throws `RangeError`, as it does on tzdata 2024b for `America/Coyhaique`, a zone added later. BE-06 needs a fallback, so that a completion from a new zone is credited and not refused.
- A missing or empty zone is refused with `RangeError` too. `Intl` would otherwise read it as the host's own zone.
- A test bans `formatToParts`, `supportedValuesOf`, `Temporal` and every clock read from `src/`. Tests themselves may use them; they run on Node.
- The package's tests run on Node and can't prove the Hermes path. A check on an iOS simulator and an Android emulator is proposed for FND-05 or FE-07: `new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Kiritimati', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.UTC(2026, 5, 15, 10, 30)))` should give `06/16/2026` (it is half past midnight there), as Node 22.14.0 and Node 26.13.1 both do, and an unknown zone should throw a `RangeError`.
- Revisit if that check fails on either platform, or when Hermes documents `Temporal`.
