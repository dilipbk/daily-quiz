# 0021. Grading and scoring: how the engine reads the eleven points the spec leaves open

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-16 |
| **Ticket** | `ENG-02` |
| **Requirements** | QT-02, QT-03, D13; spec §7.4, §10.3, §10.5; product principle 3 ("a wrong fact costs more than a missing quiz") |

## Context

The spec says what grading and scoring must achieve and leaves eleven points open: who derives the Standard limit, the difficulty curve, where a combo starts, rounding, and most of what QT-03 means by "normalization" and "typo tolerance". Each one decides whether an answer is right or how many points it earns.

The device and the server must decide alike, because the server re-grades every completion (roadmap §4.3), and two players of one challenge must be scored alike. So each point needs one reading, written down. The PM ruled on all eleven on 2026-11-15: R1 is in scope, R3 stands and the owner may overturn it, and the rest stand as read. After an independent review, on 2026-11-16, the PM added a twelfth ruling, R6a, and asked for R4 to say what the code does.

## Decision

The engine implements the readings below. Every number in them is a tunable passed in on each call; the spec's values exist once, as `specScoringConfig`, `specTimingConfig` and `specTypeAnswerTunables`, and no function falls back to them.

| # | Open point | Reading |
|---|---|---|
| R1 | Who derives the Standard limit (§10.3) | The engine. A type declares a time class, and `standardLimitMs()` gives 20 s for `choice` and 30 s for `constructed`, plus 10 s with media or math. The server calls it once when it builds a session and stores the result in the snapshot. |
| R2 | The difficulty curve | A straight line between two anchors, flat beyond them: rating 1200 gives 0.8 and 1800 gives 1.5. The server freezes the multiplier into the snapshot, and scoring takes the number, not the rating. |
| R3 | Where a combo starts | The first correct answer earns none. The n-th consecutive correct answer earns `min(10 × (n − 1), 50)`. DS-01's worked example (80 base + 32 speed = 112) leaves no room for a combo on the first. |
| R4 | Rounding | Points are whole numbers. Base and speed bonus are each `Math.round` of a product of binary floating-point numbers: the nearest whole point, with a half going up. A product that is a half on paper can sit just under it in binary, and then it goes down: rating 1590 gives a base of 125 (125.5 on paper), and a base of 100 with 8,600 ms gone of 20 s gives a bonus of 28 (28.5 on paper). The device and the server do the same arithmetic and agree, so nobody is ranked unfairly; a test and a shared fixture hold both cases. The speed bonus is a share of the rounded base, and the combo is flat. |
| R5 | `ordering` | All or nothing: any order but the key's is incorrect, with no credit. |
| R6 | Typo tolerance | On by default: no edits up to 4 characters, 1 for 5 to 8, 2 from 9, counted after normalization, with a swap of two neighbours as one edit. Never inside a number: its digits, the separator in it and its sign must be as in the answer, with a comma and a point standing for each other. A typo must be strictly closer to an accepted answer than to any rejected one. An author can lower the tolerance for a question (`maxTypos`) and list near-misses (`rejected`). An empty `typoThresholds` switches it off. |
| R6a | Roman numerals (PM ruling, 2026-11-16) | A word that is a valid Roman numeral has the stop a number has: it must match letter for letter, and no typo is forgiven across it. "Henry VII" is wrong for "Henry VIII", "Louis XVI" for "Louis XIV" and "World War I" for "World War II". A typo elsewhere in the answer is still forgiven ("Hnery VIII"). |
| R7 | Number formats | Parsing never reads a locale. A lone separator followed by exactly three digits has two readings ("1,000" is 1 and 1000), and the answer is correct if either is within the tolerance. |
| R8 | Whose locale picks the articles | The question's content language, passed in. Only its primary subtag is read. The MVP ships English: the, a, an. |
| R9 | Diacritics | Combining marks used with Latin, Greek and Cyrillic are removed, and nine letters fold (ø to o, ł to l, æ to ae and so on). Marks that carry meaning in other scripts are kept. |
| R10 | Untimed and extended time | `timed: false` pays no speed bonus. Scoring has no input for the ×1.5 or ×2 setting, so extra time can't earn points (D13). |
| R11 | An empty typed answer | `null`, a timeout, is `unanswered`. Submitted text that is empty after normalization is `incorrect`. Both score 0. |

Decisions made while building, each from a failing case:

1. **Normalization and number parsing read nothing from the environment.** Case is folded lower, upper, lower with no locale, so "ß" meets "SS" and "İ" meets "i". The final sigma is folded into σ, because lower-casing picks between the two by what follows and later steps change what follows.
2. **Every leading article is dropped, not one**, so "The A-Team" and "A-Team" compare equal and normalizing twice changes nothing. An article goes only when a space and more text follow it.
3. **Ignored characters are removed before the dot-and-comma rule**, so a zero-width space inside "3.14" doesn't turn it into 314. A dot or comma stays only between two digits.
4. **The 256-unit cap on a typed answer is checked on UTF-16 length**, because zod counts a string's `max` in code points. The cap is exported as `maxResponseLength`, so the app can cap its field at the same number.
5. **Units are matched after NFKC and lower-casing, longest first**, from the end of the text or else from its start. A numeric bound is inclusive, with a guard of `1e-9 × max(1, |value|)` against binary rounding.
6. **Typos stop at 3 edits whatever the tunables say**, and the question schema refuses a `maxTypos` above 3, so an author can't appear to raise the tolerance.
7. **Scoring guards its own inputs.** `scoreAnswer` clamps credit, time and streak and holds the multiplier it is handed to the config's two anchors, and `difficultyMultiplier` clamps to the same anchors, so a caller that skipped the schemas gets no `NaN`, no fraction, no bonus above the cap and no base above the hardest question's. A multiplier that is no positive, finite number earns nothing. The schemas cap a multiplier at 10, in a config and in an input alike. `standardLimitMs` throws a `RangeError` for a time class that isn't one of the two.
8. **A type's `check` runs only when its fields parse**, so a rule across fields never sees a value its schema refused.
9. **`src` keeps to syntax every target engine runs**: explicit character ranges, with no Unicode property escapes, lookbehind, named groups or `Intl`. Hermes' own RegExp notes list property escapes and lookbehind as supported (PM ruling, 2026-11-15), so this is a choice more than a need: explicit ranges are what R9 calls for. A test holds it.
10. **Property tests use fast-check directly**, not `@fast-check/vitest`: the connector is 0.x, a second dependency, and ties properties to one runner.
11. **A dash that begins a number is its minus.** It begins one when a digit follows it and nothing, a space or another dash comes before it, whichever dash is typed: "-40" and "−40" are one answer, and "Apollo-11", "1939-1945" and "Jean-Paul" gain no sign. Before this, every dash became a space, and "40 degrees" matched "-40 degrees" with no typo involved.
12. **On a number question, text with a digit in it is judged as a number and as nothing else.** It is correct when a reading of it is within the tolerance once a listed unit is removed, and incorrect otherwise, whatever its length: "12345k", "$12345", and "71 km" with no `km` listed, are wrong. Only text with no digit, such as "one thousand", is matched with the accepted entries.
13. **`toPlayerQuestion` copies the type and the payload and nothing else.** It doesn't remove the key from a copy, so a field added to a stored question, such as an explanation, never reaches a player by default.

What `gradeAnswer` requires: `context.tunables` must have passed the registry's `tunablesSchema`. They are not parsed again on each call, and with tunables that would fail that schema a grader throws a `TypeError`. A caller parses the tunables once, when it loads them.

Known limits, each handled by an alias or by rewriting the question:

- An accepted "The Who" with a rejected "Who" passes the schema, which compares without a locale, and then grades "The Who" incorrect in English.
- "A-ha" normalizes to "ha" in English, because the hyphen separates and "a" is then a leading article.
- "Beatles, The" doesn't match "The Beatles".
- "&" doesn't match "and".
- An ordering question with a genuine tie has one accepted order.
- With no `rejected` list, a real answer within typo distance of the accepted one grades correct: Manet for Monet, Plato for Pluto, Ireland for Iceland, Zambia for Gambia, "1.5 billion" for "1.5 million". The author lists such neighbours as `rejected`.
- A number inside a text answer must be typed with its separator: "20000 Leagues" and "20 000 Leagues" don't match "20,000 Leagues".
- A one-letter word that is a Roman numeral (I, V, X, L, C, D, M) has the numeral's stop: "John Rockefeller" doesn't match "John D. Rockefeller", and "Liv Tyler" allows no typo in "Liv".
- On a number question, an accepted entry that holds a digit and reads as no number, such as "1.5 million", accepts nothing, and "5." or "(5)" is wrong for 5 because neither reads as a number.

Known limits that an alias can't handle:

- The typo thresholds count code points after NFKD, which splits a Hangul syllable into two or three and a kana from its voicing mark. Korean and Japanese need thresholds of their own in V1.
- The schemas are strict, and zod reads every key of an object before it refuses one: an object with 1,000,000 keys takes about 150 ms (measured in review). The engine can't bound that, so the completion endpoint needs a body-size limit.

## Alternatives considered

| Alternative | Why not |
|---|---|
| R3: +10 on the first correct answer | It contradicts DS-01's 112. If the owner prefers it, one function and two fixtures change. |
| Score from the question's rating when the session completes | Ratings drift, so two players of one challenge would get different multipliers. |
| Partial credit for `ordering` | §7.4 scales points only for the slider and map types. `Grade.credit` is there when a type needs it. |
| Read the device's locale for case, numbers and articles | The device's locale isn't the content's: a German phone shows a decimal comma while playing English content. The device and the server would then disagree. |
| Remove every combining mark | Different Hindi words would compare equal. |
| Typo tolerance as a share of the answer's length, or by sound | An author can't predict it, and it forgives near-misses that are other real answers. A table of thresholds can be read and tuned. |
| Typo tolerance off until authors opt in | QT-03 asks for it. The thresholds are the kill switch if it misfires. |
| Let a number in a text answer match by any of its R7 readings, so "20000" matches "20,000" | A text key has no number to check a reading against, so "3141" would match "3.141": the fault this stop exists to end. An alias covers "20000 Leagues". |
| On a number question, let text with a digit still match an accepted entry exactly | The rule as ruled is the one an author can predict: a number question judges digits as a number. It costs "1.5 million" as an alias and "5." for 5. If the PM prefers the exception, one line and two tests change. |

## Consequences

- If the owner overturns R3, `scoreAnswer` and the fixtures `scoring/combo-ladder` and `scoring/combo-reset` change, and every score rises by 10 per correct answer after the first.
- ENG-04's snapshot must carry what both sides score with: per question the difficulty multiplier, the Standard limit and the locale; per session the scoring config and tunables it started with, or a version of them.
- Authors list near-misses as `rejected` and add aliases for the known limits. CT-02 should flag aliases that normalize alike, ordering questions with ties, a number question's accepted entry that holds a digit and reads as no number, and a text answer with a grouped number or an initial and no alias without it.
- The completion endpoint (BE-06) sets a body-size limit before it parses anything, and parses tunables once when it loads them.
- FE-04 sends typed text as typed, caps the field at `maxResponseLength`, and picks the keyboard from `payload.format`.
- V1 languages add elided articles (l', d'), letter folds per language and non-ASCII digits. Each is a table or a step in `src/text`, with fixtures.
- Revisit the typo thresholds once the first few hundred questions are played, and the syntax rule once the FND-05 smoke build has run the shared fixtures on Hermes.
