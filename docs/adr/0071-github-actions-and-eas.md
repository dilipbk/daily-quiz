# 0071. GitHub Actions for checks and API deploys; EAS for app builds, submissions and updates

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-14 |
| **Ticket** | `FND-03` |
| **Requirements** | Spec §21.2; roadmap §3.1 (CI/CD); FND-02, FND-07, QA-02 |

## Context

The earlier prototype had CI that never ran on a pull request (roadmap §9). There are two things to ship: the API's container and the app's binaries. Spec §21.2 put CI/CD on EAS Workflows.

## Decision

GitHub Actions runs `pnpm verify` on every pull request as a required check, and deploys the API. EAS Build, Submit, Update and Workflows build, sign, submit and update the app, and run Maestro.

## Alternatives considered

| Alternative | Why not |
|---|---|
| EAS Workflows for everything, as the spec says | Pull-request checks belong where branch protection lives, and the API's container is no job for a mobile build service. |
| GitHub Actions for app builds as well | We would manage macOS runners, signing credentials and caches that EAS already handles. |

## Consequences

- `verify` is a required check, enforced by a repository ruleset (FND-02).
- The repository is public, because GitHub Free refuses rulesets on a private one. Everything committed is public: no secret and no personal email address goes in a commit.
- A personal account has no merge queue, so pull requests merge one at a time.
- Secrets live only in the platforms' stores (roadmap §7). The EAS parts are unproven until FND-05b, QA-01 and QA-02.
