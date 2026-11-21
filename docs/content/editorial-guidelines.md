# Editorial guidelines

| | |
|---|---|
| **Status** | Draft for the owner's approval (CT-01) |
| **Date** | 2026-11-21 |
| **Maintained by** | PM / PO |
| **Serves** | Spec §11.6, §11.5, §7.4, PLAY-06, DLY-01, DLY-08, SAFE-07, A11Y-10, L10N-06, QT-03; ADR 0008, ADR 0021 |

These are the rules a question must meet before it is published. They are written for three readers: whoever drafts a question, a person or an AI; whoever fact-checks it; and the reviewer who approves it, who will apply them thousands of times.

**How to use them.** Rule IDs (`EG-07`, `TA-03`) are stable, and a retired rule keeps its number. A reviewer who edits or rejects a question cites the ID, so the drafter learns the rule and the PM can see which rules fail most often. The reviewer's pass in §14 is the one-page version.

**The tie-breaker.** Product principle 3: a wrong fact costs more than a missing quiz. When in doubt, reject.

## 1. The pipeline

Source → draft → fact-check → review → publish (spec §11.6).

| ID | Rule |
|---|---|
| EG-01 | A question starts from a source, not from memory. The drafter records the source before writing the question. |
| EG-02 | The fact-checker is never the drafter. For AI, that means a separate run that opens the sources itself and is not shown the draft's reasoning. `fact-check-checklist.md` is the fact-checker's document. |
| EG-03 | AI may draft and may fact-check. Nothing an AI wrote or checked is published until a named human reviewer has approved it (DLY-08, SAFE-07). |
| EG-04 | The wording is ours. Facts are free to use; another quiz's, book's or site's questions are not. Nothing is copied or lightly reworded from one without a licence on record. |
| EG-05 | When a rule and a good question conflict, the reviewer rejects and tells the PM. Rules change in this document, not case by case. |

## 2. What makes a question worth publishing

| ID | Rule |
|---|---|
| EG-06 | One question tests one fact. |
| EG-07 | Exactly one answer is right, and a player who knows the subject would not argue with it. If the truth depends on a definition, a date or who is counting, the prompt says which. |
| EG-08 | The answer is something a person can know. No opinions, no "best" or "most famous", no guessing what the author had in mind. |
| EG-09 | It is worth knowing. If the explanation has nothing interesting to add, the question is filler. |
| EG-10 | It is hard because of what it asks, never because of how it is worded. No trick questions and no catches in small words. |
| EG-11 | It stands alone. It doesn't refer to another question, to "the picture above" when there is none, or to the day it is played. |
| EG-12 | It isn't in the bank already. Search by answer and by fact before drafting. The same fact from a new angle, or in another question type, counts as a duplicate. |

## 3. Tone and language

| ID | Rule |
|---|---|
| EG-13 | Write plain English that a 13-year-old reads without effort. A specialist term appears only when knowing it is the point. |
| EG-14 | Ask a direct, complete question in positive form. Avoid "which of these is NOT"; never use a double negative. |
| EG-15 | Use American spelling in prompts, options and explanations, as the spec does. A typed answer accepts both spellings (EG-37). Don't write a question whose answer is a spelling that differs between American and British English. |
| EG-16 | Write for readers everywhere, many of them reading a second language. No idioms, no slang, no "we", "our country", "abroad" or "foreign". Say "the United States", not "America"; say "soccer" or "American football" when "football" could be either. |
| EG-17 | Sound curious and warm, never clever at the player's expense. A light touch belongs in the explanation, and never in the facts. |
| EG-18 | Give metric units first and add the other only where the question needs it. Write dates as "4 July 1776" and eras as BCE and CE. Name a season by its months. Name the currency. |
| EG-19 | Use the name by which a place or person is commonly known in English today. Accept the others as typed answers (TA-10). |

## 4. Length

A choice question allows 20 seconds to read the prompt, read the options and decide (spec §10.3). The answer buttons stay pinned while the prompt scrolls (spec §9.2), and at the largest text size everything is twice as long (A11Y-03).

| ID | Part | Aim for | Never over |
|---|---|---|---|
| EG-20 | Prompt | 120 characters | 200 |
| | Choice option | 30 characters, one line | 60 |
| | True or false statement | 100 characters | 160 |
| | Ordering item | 25 characters | 40 |
| | Typed answer, as shown on reveal | 1 to 3 words | 40 characters |
| | Explanation | 1 or 2 sentences, 200 characters | 400 |
| | Alt text | 80 characters | 150 |

These figures are first estimates. The PM tunes them after the session screens are designed (DS-04) and the first 300 questions have been reviewed.

## 5. Wrong answers

A wrong answer teaches as much as the right one: it is where a player who half-knows goes.

| ID | Rule |
|---|---|
| EG-21 | Every wrong answer is certainly wrong, under every reasonable reading of the prompt. The fact-check covers each one (FC-05). |
| EG-22 | Every wrong answer is plausible to someone who half-knows. Take them from common mistakes, near neighbors and things people confuse. No joke options and no fillers. |
| EG-23 | All options are the same kind of thing, in the same grammatical form, at the same level of detail: four cities, four years, four noun phrases. |
| EG-24 | Nothing but knowledge points to the right answer. It isn't the longest, the most exact, the only one that fits the prompt's grammar, or the only one that repeats a word from the prompt. |
| EG-25 | No "all of the above", "none of the above" or "both A and B". Never refer to an option by its position: the app may shuffle them. |
| EG-26 | Numbers and years are spread the way real guesses are, and the right one is not always in the middle. All share one unit and one precision. |
| EG-27 | A wrong answer never leans on a stereotype and never mocks a person or a group. |

## 6. Rules by question type

The five MVP types are those of spec §7.4.

| ID | Type | Rules |
|---|---|---|
| EG-28 | `single_choice` | Four options by default. Three when a fourth plausible one doesn't exist. |
| EG-29 | `true_false` | One claim, wholly true or wholly false. A false claim is a mistake people really make, not a true sentence with one word swapped. The explanation of a false claim states the truth. Across the bank, half are true. |
| EG-30 | `image_choice` | Two to four images, alike in style, crop and quality, so that none stands out for the wrong reason. The question must still be answerable from the alt text alone (EG-60). |
| EG-31 | `ordering` | Three to six items; use four unless the question is meant to be hard, because one misplaced item scores nothing (ADR 0021, R5). The prompt names the measure and the direction ("earliest first"). The order is strict: no ties, and no two items so close that sources disagree (FC-10). The explanation gives each item's value. |
| EG-32 | `type_answer` | Use it when the answer is short, has one usual form and is easy to spell, or is a number. Use a choice question when the answer needs more than three words or more than about six accepted forms, or when its spelling is the hard part. §7 applies in full. |

## 7. Typed answers

A typed answer is graded by `quiz-engine` on the device and again on the server. The author's job is to tell the engine what is right, what is nearly right and what is wrong. The rules and the known limits are in ADR 0021.

**What the engine ignores for you.** Capital letters; accents (é, ü, ñ); extra spaces; punctuation and quotation marks; hyphens and dashes, which it treats as spaces; a leading "the", "a" or "an". Don't list aliases for any of these.

**What it never forgives.** A digit, a decimal point, a thousands separator or a minus sign inside a number. A Roman numeral: "Henry VII" is wrong for "Henry VIII". Anything listed as `rejected`.

**What it can forgive, when a question allows it.** Typos, by the length of the answer: none up to 4 characters, one from 5 to 8, two from 9. Two neighboring letters swapped count as one. Left to itself, the engine allows them on every question.

**The danger.** With typos allowed and nothing rejected, a different real answer one slip away is graded correct: Manet for Monet, Ireland for Iceland, Zambia for Gambia, Austria for Australia, ethanol for methanol, hypotension for hypertension, astrology for astronomy.

### The policy

> **Decided by the owner on 2026-11-21 (EG-33): typed answers are exact by default.** The alternatives were exact only for the names of people and places, and typos allowed on every typed answer with near-misses listed each time.

| ID | Rule |
|---|---|
| EG-33 | **A typed answer forgives no typo** unless its author switches tolerance on for that question. In the question file `maxTypos` is 0 unless the author sets it, and the pipeline always writes it into the key, so the engine's own default is never used. "Exact" still ignores everything in the first list above. A number is never forgiven a typo, whatever is set. |
| EG-34 | An author may switch tolerance on, by setting `maxTypos` to 1 or 2, only when all of these hold: the answer has five or more characters; the author has searched for real answers of the same kind within reach, which is one change for an answer of 5 to 8 characters and two from 9; EG-35 doesn't forbid it; and the question file says the search was done. The engine still allows no more typos than the answer's length does. Tolerance is safe when the search finds nothing: "Kilimanjaro", "Tchaikovsky", "photosynthesis". |
| EG-35 | Tolerance is never switched on for: the name of a person or a place that has a real near neighbor (Iceland and Ireland, Australia and Austria, Monet and Manet); an answer that contains a number; an answer with a single-letter or single-digit part (Vitamin A, Type O). Listing the neighbor as `rejected` doesn't make these safe. |
| EG-36 | Wherever tolerance is on, every real answer within reach is listed as `rejected`: "ethanol" on "methanol", "hypotension" on "hypertension". The reviewer checks that list on every such question. If there are more than two, the answer stays exact. |
| EG-37 | List as `accepted` every form a player who knows the answer would type: the full name and the short one, both spellings, the abbreviation, the older name. The first entry is the one shown on reveal, so it is the full, correct, usual form. List real variants, not misspellings: for a spelling that is hard, switch tolerance on under EG-34 or ask a choice question. An answer holds at most 20 accepted and 20 rejected entries of 120 characters each. |
| EG-38 | The prompt says what form is wanted: "Which country…", "Give the surname", "Answer in meters". A player should never lose a point for answering a different question well. |
| EG-39 | For a number, the prompt states the unit, and `units` lists every way to type it ("km", "kilometers", "kilometres"). `tolerance` is 0 unless the prompt says "about" or "to the nearest…". It is always 0 for a year or a count, and it never reaches as far as a plausible wrong answer. A number over five digits is asked "in thousands" or "in millions". |
| EG-40 | Every typed question carries example answers: at least three that must be accepted and three that must be rejected, the near-misses among them. `content:validate` runs them through the real grader, so a reviewer checks the lists and doesn't simulate the engine by eye. |

### Checks for every typed answer

Each check comes from a known limit of the engine (ADR 0021). The drafter applies them; the reviewer confirms them from the example answers of EG-40.

| ID | Check | What the engine does | What to do |
|---|---|---|---|
| TA-01 | Is tolerance on, and is another real answer one slip away? | It grades a typo correct unless that typo is nearer to a `rejected` entry | Apply EG-34 to EG-36: list the near-misses as `rejected`, or leave the answer exact |
| TA-02 | Does one letter or digit tell this answer from its siblings (Vitamin A, Hepatitis B, Type O)? | With tolerance on, a single letter is not protected, so "Vitamin A" passes for "Vitamin E". Only I, V, X, L, C, D and M are protected, as Roman numerals | Never switch tolerance on (EG-35). A choice question is usually better |
| TA-03 | Does the answer contain a Roman numeral (Henry VIII, World War II, Rocky II)? | The numeral must match letter for letter, and "2" does not match "II" | Add the forms people type: "World War 2", "Second World War", "Henry the Eighth" |
| TA-04 | Is one of its words also a valid Roman numeral (Liv, Xi, Li, Mix, DC, MC)? | That word allows no typo at all: "Lib Tyler" is wrong for "Liv Tyler" | Nothing to fix. Add any other usual spelling as an alias |
| TA-05 | Does the name carry an initial (John D. Rockefeller, Samuel L. Jackson)? | The name without the initial doesn't match. With tolerance on it can match when it shouldn't: "George Bush" passes for "George W. Bush" | If the name without the initial is still this person, add it as an alias. If it could be someone else, list it as `rejected` |
| TA-06 | Does a text answer contain a number (20,000 Leagues Under the Sea)? | The number must be typed with the same separator: "20000 Leagues" does not match | Add aliases without the separator, with a space, and in words if people would write it so |
| TA-07 | Does it contain "and" or "&"? | They don't match each other | List both |
| TA-08 | Does it begin with an article that is part of the name (The Who, A-ha, The The)? | The article is dropped: "A-ha" is compared as "ha". A `rejected` entry that equals an accepted one without its article makes the right answer wrong | Never reject the article-less form. Add the run-together spelling ("Aha"). Put both in the must-accept examples |
| TA-09 | Can the words come in another order (Beatles, The; Kim Yuna and Yuna Kim)? | Word order must match | List each order that is normal for this name |
| TA-10 | Does it have another name, spelling or language (Kyiv and Kiev, Mumbai and Bombay, Munich and München, USA and United States)? | Only accents are folded; "Muenchen" and "Kiev" are different strings | List each form still in common use. Don't mark an older name wrong unless the question is about the name |
| TA-11 | Is it written with a hyphen or a space (Spider-Man, ice cream)? | A hyphen equals a space, but the run-together form is one change away, and an exact answer forgives none | Add the run-together form as an alias |
| TA-12 | Would a player type only the surname? | Only whole accepted entries match | Add the surname when it can mean no one else here. If it can ("Roosevelt"), ask for the full name in the prompt |
| TA-13 | Number question: would a player type a symbol or a unit ($5, 5 km, 5%)? | Text with a digit must read as the number once a listed unit is removed. "$5" is wrong unless "$" is a unit, and so is "(5)" | List every unit and symbol a player might type, written without a full stop: "in" accepts "5 in" and "5 in.", but "in." accepts only "5 in." |
| TA-14 | Number question: would a player type words (twelve, 1.5 million, a dozen)? | Words match only an accepted entry | Add the word forms as accepted entries. No typo is forgiven on "1.5 million" |
| TA-15 | Number question: is each accepted entry that is a number within the tolerance? | An entry that reads as a number outside the tolerance accepts nothing | Remove it or correct the key |
| TA-16 | Number question: is the answer below 1,000 with a tolerance above 0? | "2,500" reads as both 2.5 and 2500, and passes if either is in range | State the unit in the prompt, and put the thousand-times-larger answer in the must-reject examples |
| TA-17 | Is every accepted entry in Latin letters? | Typo thresholds are wrong for Korean and Japanese until V1 | At launch, answers are in Latin script. Add the romanized form of any other |

## 8. Explanations and sources

Every question has an explanation and at least one source, and players see both (PLAY-06).

| ID | Rule |
|---|---|
| EG-41 | The explanation states the answer in a full sentence, then says why, or adds one fact worth remembering. It makes sense read alone, in the review screen or the mistakes deck. |
| EG-42 | It is shown after a right answer and after a wrong one, so it never says "Correct!" or "you". Where one wrong answer is the common mistake, it says why that one is wrong. |
| EG-43 | Every fact in the explanation is in the sources. An explanation is fact-checked as closely as the answer (FC-12). |
| EG-44 | List at least one source a player can open: free to read, no sign-in, in English, the page that states the fact and not a home page or a search result. Links are `https` in the canonical form of ADR 0008, with tracking parameters removed. |
| EG-45 | The listed source is of tier A or B (`fact-check-checklist.md`, §2). An encyclopedia anyone can edit, a quiz site, a forum or an AI's answer may lead to a source and is never one. |

## 9. Neutrality and sensitive subjects

The audience is 13 and over, everywhere (spec D1, D2).

| ID | Rule |
|---|---|
| EG-46 | Religion and belief are described, never judged. Ask what a tradition holds, celebrates or wrote ("In Islam, which month is the month of fasting?"). Never present a belief as true or false, and never rank traditions. |
| EG-47 | No question's answer may depend on a disputed border, a disputed name or whether a territory is a country. "Country" means a member state of the United Nations unless the prompt says otherwise. |
| EG-48 | Everything is suitable at 13: no sexual content, no graphic violence, no instructions for drugs, weapons or gambling. Alcohol appears only as food science, farming or history, and such a question is flagged so that it can be filtered. A question that would need a higher `minAge` isn't written. |
| EG-49 | About a living person, ask only public facts about their work. Nothing on health, family, private life, wealth or accusations. |
| EG-50 | No question takes a side in a live political dispute. Election results, laws and offices held are facts of record and are fine. Disasters, attacks and atrocities are asked about soberly, never as light trivia, and never within ten years of the event. |
| EG-51 | No question or option relies on a stereotype of a nationality, a sex, a religion, an age or a disability. People are named as they name themselves. |

## 10. Facts that change

| ID | Rule |
|---|---|
| EG-52 | No question about an event less than a year old. The facts are still moving, and so are the sources. |
| EG-53 | A fact that changes slowly (a record, a population, the tallest or the largest of something) carries its date in the prompt: "As of 2025, which…". The question is flagged as time-sensitive with a date, at most 12 months ahead, by which it is checked again. |
| EG-54 | A fact that changes fast isn't asked: who holds an office now, the latest version, this season's ranking. Ask the dated form: "Who became … in 2019?" |
| EG-55 | No "currently", "recently", "this year" or "so far". A question is read years after it is written. |

## 11. Difficulty

The label seeds the question's rating (easy 1200, medium 1500, hard 1800; spec §11.5) and sets the points it is worth until play corrects it (ADR 0021, R2).

| ID | Rule |
|---|---|
| EG-56 | Label by how many curious adults, not specialists, you expect to answer correctly: **easy** three in four or more, **medium** about half to three in four, **hard** one in five to about half. Below one in five the question is too obscure for launch. |
| EG-57 | A question is made harder by the knowledge it asks for, never by longer text, closer wrong answers on a point of wording, or an obscure way of asking for a common fact. |
| EG-58 | The launch bank aims for two easy and two medium questions for every hard one, and each domain holds at least 60 easy ones (`taxonomy.md`, §7). |

## 12. Images, math and code

Content is structured blocks (spec §11.3, ADR 0008).

| ID | Rule |
|---|---|
| EG-59 | Use an image when the question is about what something looks like, never as decoration. Its licence and credit are on record before drafting: our own, public domain, or a licence that allows commercial use. It reads clearly at phone width, and no text inside it carries the question. |
| EG-60 | Alt text is required (A11Y-10). It describes what a sighted player would use to answer and does not name the answer: "A white flag with a red disc in the center", not "The flag of Japan". If the image can't be described without giving the answer away, the question doesn't work for a screen reader and is not published. |
| EG-61 | Math is a `math` block in LaTeX; chemistry uses `mhchem`. Simple subscripts and superscripts in running text (H₂O, m²) use the inline marks. Code is a `code` block with its language, at most 12 lines of at most 40 characters. |
| EG-62 | A question with an image or a math block gets ten more seconds (spec §10.3). Don't add either to an easy question to make it look richer. |

## 13. Sets

### The Global Daily

Everyone in the world plays the same eight questions on a date and compares a percentile (DLY-01, DLY-06), so a daily question has to be fair to all of them.

| ID | Rule |
|---|---|
| EG-63 | Eight questions from at least five domains, three easy, then three medium, then two hard (DLY-01). No two from one topic. |
| EG-64 | No region-tagged question (TX-13) and no time-sensitive one (EG-53). A daily is scheduled weeks ahead and can't go stale. |
| EG-65 | The first question is an easy choice question. At most one typed answer and one ordering question in a set. |
| EG-66 | No question gives away another's answer, and no two share an answer. A question used in a daily isn't used in another for a year. |
| EG-67 | A reviewer plays the whole set in order before it is scheduled, as well as approving each question (DLY-08). |

### Quizzes

| ID | Rule |
|---|---|
| EG-68 | A quiz has one subject that its title states, and 8 to 10 questions: about three minutes (product principle 1). It opens with its easiest question and mixes at least two question types. |
| EG-69 | EG-66 applies inside a quiz. A region-tagged question appears only in a quiz whose title makes the region plain (TX-14). |

## 14. The reviewer's pass

One question, in this order. Stop at the first failure.

1. **Answer it yourself** before looking at the key. If you hesitate between two answers, or your answer isn't the key, it fails EG-07.
2. **Read the fact-check record.** It was made by someone other than the drafter (EG-02), its result is "pass", and the quoted line supports the key as worded. Open the source yourself for a hard question, a number, a superlative, a living person, and at least one question in five of the rest.
3. **Read the wrong answers.** Each is certainly wrong (EG-21), plausible (EG-22) and the same kind of thing (EG-23). Nothing gives the right one away (EG-24).
4. **For a typed answer,** confirm it is exact, or that tolerance is on within EG-34 to EG-36 with its near-misses rejected. Read the accepted, rejected and example lists against checks TA-01 to TA-17. Type the answer the way you would on a phone.
5. **Read it as a player.** It is clear on first reading (EG-13, EG-14), within length (EG-20), and neutral (EG-46 to EG-51).
6. **Read the explanation.** It states the answer, reads right after a wrong answer, and adds nothing unsourced (EG-41 to EG-43).
7. **Check the labels.** Domain and topic (`taxonomy.md`), difficulty (EG-56), region tags (TX-11), the time-sensitive flag (EG-53), alt text (EG-60).

Then decide:

- **Approve.**
- **Edit and approve** when the fault is in the wording, a label or a missing alias.
- **Reject**, citing the rule, when the fact, the key or a wrong answer is in doubt. A rejected question goes back to fact-check, not to a quick fix.

## 15. What the pipeline must enforce

A rule a tool can check should not depend on a reviewer's attention. These are requests to CT-02 (`content:validate`) and CMS-01 (the review tool). Each ticket's plan says how.

- **Required on every question:** a domain and topic from `taxonomy.md`, a difficulty, a locale, at least one source, an explanation, alt text on every image, and the fact-check record with a checker who is not the drafter.
- **Typed answers:** `maxTypos` defaults to 0 in the file format and is always written into the key (EG-33); tolerance is refused where a tool can see that EG-35 applies (a digit, a single-letter part); the note EG-34 asks for wherever tolerance is on; the example answers of EG-40, run through the real grader.
- **Lints for the reviewer,** from ADR 0021: an accepted answer within typo distance of another real answer, checked against lists of countries, capitals and elements and against the bank's other answers; a grouped number or an initial with no alias; an accepted number outside its tolerance; a rejected entry that equals an accepted one once articles are dropped; aliases that normalize alike; an ordering question with a tie.
- **Lengths:** a warning past "aim for" and an error past "never over" (EG-20).
- **Flags:** time-sensitive with its check-by date (EG-53); alcohol (EG-48); the image's licence and credit (EG-59).
- **Sets:** EG-63 to EG-66 checked when a daily is assembled.
- **Review tool:** the fact-check quote beside the key; a box to try a typed answer against the real grader; reject reasons chosen by rule ID; the reviewer's name on every approval (SAFE-07).
- **Duplicates:** a search by answer and by source when a draft is opened (EG-12).
