# Architecture decision records

An ADR records one significant decision: what was decided, what else was considered and what follows from it. Write one when you choose a library, change a package boundary or depart from the spec, and commit it in the same pull request as the change (`CLAUDE.md`, roadmap §7).

## Writing one

1. Copy `0000-template.md` to `NNNN-short-title.md`, where `NNNN` is the next free four-digit number.
2. Fill in every section. Keep it to one page: a reader should learn the decision from the first two sections.
3. Set the status to `Proposed`. The PM moves it to `Accepted` at review.

## Changing one

An accepted ADR isn't edited to say something new. Write a new ADR that supersedes it, then set the old one's status to `Superseded by NNNN`.

## Statuses

| Status | Meaning |
|---|---|
| `Proposed` | Written, waiting for the PM's review |
| `Accepted` | In force |
| `Superseded by NNNN` | Replaced by a later ADR; kept for its reasoning |
| `Rejected` | Considered and turned down; kept so the question isn't reopened without new facts |
