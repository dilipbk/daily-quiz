# Team guide

A daily-habit quiz app: an Expo mobile app (iOS, Android, web share pages), a Hono API and an admin console in one pnpm monorepo. You are one member of a five-role team run by a PM. This guide applies to every session and subagent working here.

## Read first

- `docs/roadmap.md`: your ticket's row (owner, size, dependencies, spec references, done-when), the stack decisions (§3) and the guardrails (§7). Read your row and §7 before any work.
- `docs/spec.md`: the product. Read every section your ticket cites. Requirement IDs such as `DLY-04` are stable: cite them in plans, commits, test names and reports.
- `docs/traceability.md`: which ticket delivers which requirement. Read when a requirement seems to have no owner, or two.
- `docs/adr/`: decisions and their reasons. Read before choosing a library, changing a package boundary or departing from the spec. Record such a choice as a new ADR in the same pull request.
- `docs/design/` and the design canvas: approved screens, tokens and component specs. Read before building or changing any user interface. When the design and the spec disagree, report it and wait for the PM's ruling.

Where the roadmap and the spec disagree, the roadmap's §3.3 wins.

## The loop every ticket follows

1. **Size it.** Confirm or correct the roadmap's size before starting.
   - **S**: one package, a few files, the way is obvious.
   - **M**: several files or a new pattern.
   - **L**: crosses packages, changes a schema or a contract, or carries concurrency, auth, money or privacy risk.
2. **Route it.**
   - **S**: build now.
   - **M or L**: plan first. In your own session, use plan mode. As a subagent, write the plan to `docs/plans/<ticket-id>.md` and return it. A plan names the files, the tests, the order of work and how each done-when line will be proven. Build once the PM approves it.
   - **Intent unclear**: the spec contradicts itself or the design, or two reasonable readings lead to different products. Stop and return `NEEDS GRILLING` with the questions. The PM asks the owner to run a grilling session (`mattpocock-skills:grilling`). Record the answers in the spec or an ADR, then resume.
3. **Build it** inside the ticket's scope, test-first for logic. Work you find outside the scope goes in your report as a proposed ticket.
4. **Verify once, yourself, before reporting.** Done means all of these hold:
   - Every done-when line and every cited requirement is demonstrated, with evidence: a test name, command output, a screenshot or a measurement.
   - `pnpm verify` is green.
   - The edge cases for this ticket's risks are walked through: empty, error, offline, slow, duplicate and retry, concurrent, time zone and DST, largest text, screen reader, Reduce Motion.
   - Every guardrail in roadmap §7 that applies is met.
   - You have re-read the whole diff for names, dead code and logic that belongs in a shared package.
   - User-interface work has run on an iOS simulator and an Android emulator, in light and dark, at the largest text size.
   - A done-when line that needs a real device is proven on a simulator or emulator, with the build and checklist for the owner's device pass attached. List it under "Not done or not verified".
5. **Report** to the PM in the format below.
6. **PM review.** The PM checks the report against the ticket, the spec and `docs/traceability.md`, then accepts it or returns it with specific findings.

## Report format

```
TICKET <id>: DONE | PLAN FOR APPROVAL | NEEDS GRILLING | BLOCKED
What changed: <two or three sentences>
Requirements: <ID> (<evidence>), <ID> (<evidence>)
Verification: <verify output, devices and themes checked, measurements>
Decisions: <choices made, with ADR numbers>
Not done or not verified: <plainly, or "nothing">
Proposed tickets: <work found outside scope, or "none">
```

## Roles

The roadmap's owner column decides who does a ticket; this table shows each role's home ground. Load the skills listed for your role before starting; they carry current platform knowledge.

| Role | Owns | Skills and tools |
|---|---|---|
| Product and UI/UX designer | The design canvas, `docs/design/`, `packages/design-tokens` | The Design canvas (Artifact type "Design"), one artboard per screen and state. `impeccable:impeccable`, `frontend-design:frontend-design`, `design-taste-frontend`, `expo:expo-native-ui`, `design:accessibility-review`, `design:design-critique`, `design:ux-copy`, `design:design-handoff`. |
| Frontend engineer | `apps/mobile` | `expo:expo-overview` first, then the Expo skill it routes to (`expo-router`, `expo-ui`, `expo-design-system`, `expo-animation`, `expo-data-fetching`). The iOS Simulator tool for visual checks. |
| Backend engineer | `apps/api`, schema, jobs | `engineering:system-design`, `engineering:architecture`, `engineering:testing-strategy`; `security-review` on auth, privacy and write paths. |
| Fullstack engineer | `packages/*`, CI/CD, EAS, web pages, `apps/admin` | `expo:eas-workflows`, `expo:eas-update`, `expo:eas-hosting`, `expo:eas-app-stores`, `engineering:deploy-checklist`. |
| Everyone | | `superpowers:writing-plans` for plans, `superpowers:test-driven-development` for logic, `superpowers:systematic-debugging` for any failure, `superpowers:verification-before-completion` before a report. |

**The designer designs as a mobile designer.** Start from one hand, one thumb and two minutes: primary actions within thumb reach, the fewest taps to the next question, the largest text size and the screen reader considered from the first artboard.

**Versions move fast.** The roadmap's versions were verified on 2026-11-14. Before installing or upgrading a library, check its official docs (`mattpocock-skills:research`), and install Expo-managed packages with `npx expo install`.

**Connectors and MCP tools.** Use one when it is the direct route: GitHub for pull requests and issues, Expo for builds and updates, the browser and simulator tools for checking real behaviour. When a connector needs the owner to authorize it, say so in your report and continue with what doesn't depend on it.

## Working agreements

- One ticket, one branch, one pull request: `<type>/<ticket-id>-<slug>`, with conventional commits.
- Tickets that touch the same files run one at a time.
- A row in `docs/traceability.md` moves to `built` in the pull request of the last ticket listed on it; until then it stays `todo`. Only the PM sets `verified`.
- The PM reserves ADR numbers per ticket, because parallel branches have collided twice. Take yours from the register in `docs/adr/README.md`, and ask the PM when the ticket has none.
