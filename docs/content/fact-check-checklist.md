# Fact-check checklist

| | |
|---|---|
| **Status** | Draft for the owner's approval (CT-01) |
| **Date** | 2026-11-21 |
| **Maintained by** | PM / PO |
| **Serves** | Spec §11.6, §11.5, SAFE-07, PLAY-06, DLY-08, product principle 3 |

The fact-check is the step between a draft and the reviewer (spec §11.6). It answers one question: is everything this question tells a player true? Its output is a record the reviewer can trust at a glance, which is what lets a human review take a minute and still mean something.

Check IDs (`FC-06`) are stable. A question that fails cites the ID.

## 1. How to check

| ID | Rule |
|---|---|
| FC-01 | The checker is not the drafter (EG-02). An AI checker is a separate run that sees the question and its key, and none of the drafter's reasoning. |
| FC-02 | The checker opens every source. A page that won't open, or that needs payment or a sign-in, doesn't count. An AI checker fetches the page and quotes it; it never answers from memory. |
| FC-03 | The checker looks for the way the question could be wrong, not for agreement. Start by searching for a second right answer and for the famous false version of the fact. |

## 2. Sources

| Tier | What it is | Examples | Counts as |
|---|---|---|---|
| A | The primary record, or the body responsible for the fact | A competition's official results, a national statistics office, a standards body, a space agency's mission page, a museum's entry for an object it holds, the text of the work itself, a peer-reviewed paper | Enough alone |
| B | An edited reference work, or an expert institution writing in its own field | An encyclopedia with named editors, a dictionary, a standard textbook, a university's or a scientific society's explainer | Enough alone, except where FC-04 asks for two |
| C | Reporting by a news organization that publishes corrections | | Enough for the fact that an event happened and when. Not for science, statistics or history |
| D | Everything else | An encyclopedia anyone can edit, a quiz or trivia site, a forum, social media, a personal blog, an AI's answer | Never a source. Use it to find one |

Two sources are independent when neither cites the other and they don't both repeat a third.

## 3. The checks

| ID | Check | Fails when |
|---|---|---|
| FC-04 | **Two independent sources of tier A or B** support any of these: a first, an only, a largest or any other superlative; a statistic or measurement; a quotation and who said it; a claim about a living person; anything about health or safety; a fact with a well-known false version; a date or a name on which sources differ | Only one source can be found, or the two disagree |
| FC-05 | **Every wrong answer is wrong.** Each option is checked on its own against the prompt, under every reasonable reading | An option is also right, right by another definition, or simply unchecked |
| FC-06 | **The key says what the source says:** the same thing, scope, date and unit | The key is an inference, a rounding, a wider or narrower claim, or a paraphrase that changes the meaning |
| FC-07 | **There is one right answer.** The checker has searched for another answer that fits the prompt: a tie, an earlier "first", a second country that also qualifies | One exists. Narrow the prompt, or fail the question |
| FC-08 | **The prompt's own assumptions are true.** "Who invented X?" assumes one inventor; "Which is the largest…?" assumes one measure | The assumption is false or contested |
| FC-09 | **Numbers, dates and units** match the source. Conversions are recomputed. A figure that changes carries its date (EG-53). A typed answer's tolerance stops short of every plausible wrong value (EG-39) | Any of these is off, however slightly |
| FC-10 | **Ordering:** each item's value is sourced, and neighbors differ by more than sources disagree | Two items tie or nearly tie |
| FC-11 | **Quotations and names:** a quotation is traced to the work or to a reference that cites the work, and attributed to who said it there. A person's name is spelled as they spell it | The wording or the speaker comes only from quotation sites |
| FC-12 | **The explanation:** every fact in it passes the same checks as the key (EG-43) | It adds a claim no source supports |
| FC-13 | **Images:** the picture shows what the question says, confirmed where the image comes from and not by its file name. The licence and credit are recorded (EG-59). The alt text is accurate and doesn't name the answer (EG-60) | The subject or the licence can't be confirmed |
| FC-14 | **Typed answers:** every accepted entry is truly the same answer, and every rejected entry is truly wrong (EG-37) | An alias is a different thing, or a rejected entry is a valid name for the answer |
| FC-15 | **Will it still be true in two years?** | No: apply EG-53 or EG-54 |
| FC-16 | **The key is not a popular myth.** Check it against the well-known misconceptions on its subject. A myth may be a wrong answer or a false statement; it may never be the key | The "fact" is the myth |
| FC-17 | **The listed source opens** and is in the form EG-44 asks for | The link is dead, paywalled, or points at a home page |

**Words that call for a second look:** first, only, largest, oldest, most, never, always, invented, discovered, named after, exactly, and any quotation or statistic.

## 4. The record

Every question carries its fact-check record from this step onward (SAFE-07). The reviewer reads it beside the key.

| Field | What goes in it |
|---|---|
| Result | Pass, fix or fail |
| Sources | For each: the link, the publisher, the tier and the date it was opened |
| Supporting line | For each source, the sentence that states the fact, copied exactly and kept short. It is for the reviewer and is never shown to players |
| What was checked | The key, each wrong answer and the explanation, each marked against its source |
| Checker and date | A person's name, or the AI run and its model |
| Notes | For a fix: the exact change. For a fail: the check that failed |

## 5. Results

- **Pass:** every check holds. The question goes to review.
- **Fix:** the fact is right, and a wording, a number, an option or the explanation needs a change the checker can state exactly. The changed parts are checked again before review.
- **Fail:** the key isn't supported, a second right answer exists, no tier A or B source can be found, or sources disagree. The question goes back to the drafter or is dropped. It never goes to review.

A checker who can't decide fails the question (product principle 3).

## 6. After publication

A published question is checked again, from FC-03, when any of these happens:

- its check-by date arrives (EG-53);
- a player reports a wrong answer (PLAY-05);
- its statistics raise a flag: fewer than 5% or more than 98% of players answer correctly, a wrong answer is chosen more often than the right one, or its report or quit rate is high (spec §11.5);
- it is suspended automatically for a high report rate (SAFE-07).

A wrong answer chosen more often than the right one is the strongest sign of a wrong key or a second right answer: run FC-05 to FC-07 first.

A correction is published as a new version, and the old one stays for history (spec §11.2). The record says what was wrong and which check should have caught it, so the PM can see where the checklist needs to change.
