# Content rules

The three documents that decide what a question must be before it is published (roadmap CT-01, spec §11.4 to §11.6). All three are **drafts until the owner approves them**.

| Document | Answers | Rule IDs |
|---|---|---|
| [`taxonomy.md`](taxonomy.md) | Where a question is filed: the 11 domains, their topics, tags and region tags | `TX-` |
| [`editorial-guidelines.md`](editorial-guidelines.md) | How a question is written: tone, length, wrong answers, typed answers, explanations, neutrality, sets | `EG-`, `TA-` |
| [`fact-check-checklist.md`](fact-check-checklist.md) | How a question is proven true, and what record the check leaves | `FC-` |

A drafter reads all three. A fact-checker works from the checklist. A reviewer works from §14 of the guidelines, which is one page.

## Why they live here

`content/` at the repository root holds questions and daily sets as data, which `content:validate` will walk and the CMS will later take over (roadmap §4.2). These are documents people read and approve, and they outlive that move, so they sit in `docs/` beside the spec and the roadmap.

## Decisions the owner is asked to make

Approving the pull request approves the defaults below. Each can be changed on its own. The first is already decided.

| # | Decision | Default in the drafts | Where |
|---|---|---|---|
| 1 | Typed answers: which forgive a typo | **Decided by the owner on 2026-11-21:** exact for the names of people and places; typos allowed elsewhere after a near-miss search | Guidelines EG-33 |
| 2 | Who reviews, and how many hours a week (O-4) | Not set. The documents say "a named human reviewer" | Guidelines EG-03 |
| 3 | Where content comes from, and on what licence (spec Q8) | Written in-house, by people or AI, from sources; nothing copied from another quiz product without a licence on record | Guidelines EG-04 |
| 4 | Which sources are good enough | Tier A or B only; an encyclopedia anyone can edit is never the listed source | Checklist §2, guidelines EG-45 |
| 5 | Spelling and units | American spelling, as in the spec; metric first | Guidelines EG-15, EG-18 |
| 6 | Alcohol and other age-sensitive subjects | Suitable at 13; alcohol only as food science, farming or history, and flagged | Guidelines EG-48 |
| 7 | The topic lists, and where games, economics and civics go | 77 topics; games in Entertainment; economics and civics under Geography | Taxonomy §3, §8 |
| 8 | Launch targets by domain, topic and difficulty | At least 200 questions a domain and 20 a topic; two easy and two medium for each hard | Taxonomy §7, guidelines EG-58 |
| 9 | Length limits | First estimates, to be tuned after DS-04 and the first 300 questions | Guidelines EG-20 |
| 10 | Global Daily limits beyond DLY-01 | No region-tagged or time-sensitive question; at most one typed answer and one ordering question | Guidelines EG-63 to EG-67 |

## Changing them

The PM changes these documents in a pull request and the owner approves it. A rule keeps its ID for life; a retired rule keeps its number and says "retired". CT-02 and CMS-01 build what §15 of the guidelines asks tools to enforce.
