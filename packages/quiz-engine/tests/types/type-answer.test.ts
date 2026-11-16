import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { runGradingFixtures } from '../../src/core/conformance.ts';
import { gradeAnswer } from '../../src/core/grading.ts';
import { correct, incorrect, invalid } from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';
import { gradingFixtures } from '../../src/fixtures/index.ts';
import { mvpRegistry, specMvpTunables } from '../../src/types/index.ts';
import {
  maxResponseLength,
  specTypeAnswerTunables,
  typeAnswer,
  typeAnswerTunablesSchema,
} from '../../src/types/type-answer.ts';
import { answerWord } from '../support/arbitraries.ts';

/** Where the question schema objects, or nowhere when the question is sound. */
const issuePaths = (question: unknown): PropertyKey[][] => {
  const result = mvpRegistry.questionSchema.safeParse(question);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
};

const textQuestion = (key: unknown) => ({
  type: 'type_answer',
  payload: { format: 'text' },
  key,
});
const numberQuestion = (key: unknown) => ({
  type: 'type_answer',
  payload: { format: 'number' },
  key,
});
const typed = (text: unknown) => ({ type: 'type_answer', response: { text } });

const context = { locale: 'en', tunables: specMvpTunables };
const withTunables = (changes: Partial<typeof specTypeAnswerTunables>) => ({
  locale: 'en',
  tunables: { type_answer: { ...specTypeAnswerTunables, ...changes } },
});

/** Runs the shared fixtures with these names, and fails if one of them is missing. */
const runFixtures = (...names: string[]) => {
  const ids = names.map((name) => `type_answer/${name}`);
  const chosen = gradingFixtures.filter((fixture) => ids.includes(fixture.id));

  expect(chosen.map((fixture) => fixture.id).sort()).toEqual([...ids].sort());
  return runGradingFixtures(mvpRegistry, chosen, specMvpTunables);
};

describe('type_answer grading', () => {
  it('QT-03 accepted aliases', () => {
    expect(
      runFixtures(
        'exact',
        'case-and-space',
        'diacritics',
        'punctuation',
        'wrong',
        'leading-article',
        'alias',
        'article-other-locale',
        'article-from-tunables',
        'letter-fold',
        'symbols-kept',
        'symbols-exact',
      ).failures,
    ).toEqual([]);
  });

  it('QT-03 numeric tolerance', () => {
    expect(
      runFixtures(
        'number-plain',
        'grouping-comma',
        'grouping-dot',
        'grouping-space',
        'number-trailing-zero',
        'number-plus-sign',
        'number-off',
        'number-words',
        'decimal-comma',
        'tolerance-edge',
        'tolerance-out',
        'separator-dropped',
        'binary-rounding',
        'binary-rounding-out',
        'unit-symbol',
        'unit-suffix',
        'unit-unlisted',
        'unit-out',
      ).failures,
    ).toEqual([]);
  });

  it('QT-03 typo tolerance scales with answer length', () => {
    expect(
      runFixtures(
        'typo-swap',
        'typo-drop',
        'typo-two-edits',
        'typo-three-edits',
        'short-answer-no-typos',
        'digits-differ',
        'digits-same',
        'rejected-near-miss',
        'tie-with-rejected',
        'typo-clear-of-rejected',
        'typos-off',
      ).failures,
    ).toEqual([]);
  });

  it('R6: typos are 0 up to 4 characters, 1 from 5 to 8 and 2 from 9, counted after normalization', () => {
    const grade = (accepted: string, text: string) =>
      gradeAnswer(mvpRegistry, textQuestion({ accepted: [accepted] }), typed(text), context).status;

    expect(grade('Oslo', 'Osla')).toBe('incorrect');
    expect(grade('Paris', 'Pariz')).toBe('correct');
    expect(grade('Paris', 'Pazis')).toBe('correct');
    expect(grade('Paris', 'Pazjs')).toBe('incorrect');
    expect(grade('Budapest', 'Budapset')).toBe('correct');
    expect(grade('Budapest', 'Budepset')).toBe('incorrect');
    expect(grade('Reykjavik', 'Reikjavyk')).toBe('correct');
    expect(grade('Reykjavik', 'Reikjevyk')).toBe('incorrect');
    // The length is that of the answer as compared: the article and the full stop don't count.
    expect(grade('The Who.', 'Whu')).toBe('incorrect');
  });

  it('R6: no typo is forgiven inside a number: its digits, the separator in it and its sign', () => {
    const grade = (accepted: string, text: string) =>
      gradeAnswer(mvpRegistry, textQuestion({ accepted: [accepted] }), typed(text), context).status;

    expect(grade('1.5 million', '15 million')).toBe('incorrect');
    expect(grade('12.5 percent', '125 percent')).toBe('incorrect');
    expect(grade('12.5 percent', '1.25 percent')).toBe('incorrect');
    expect(grade('3.14159', '314159')).toBe('incorrect');
    expect(grade('Area 51', 'Area 5 1')).toBe('incorrect');
    // No typo at all: the minus was dropped as punctuation.
    expect(grade('-40 degrees', '40 degrees')).toBe('incorrect');
    expect(grade('40 degrees', '-40 degrees')).toBe('incorrect');
    expect(grade('40 degrees', '\u201340 degrees')).toBe('incorrect');

    // The same number: a minus sign for the hyphen, a decimal comma for the point.
    expect(grade('-40 degrees', '\u221240 degrees')).toBe('correct');
    expect(grade('-40 degrees', '-40 degres')).toBe('correct');
    expect(grade('12.5 percent', '12,5 percent')).toBe('correct');
    expect(grade('1.5 million', '1.5 milion')).toBe('correct');
    // A hyphen that begins no number still only joins words.
    expect(grade('Apollo-11', 'Apollo 11')).toBe('correct');
    expect(grade('Apollo 11', 'Apollo11')).toBe('correct');
    expect(grade('Jean-Paul', 'Jean Paul')).toBe('correct');

    // The same stop where a number question lists an alias with a number in it.
    const population = numberQuestion({
      accepted: ['1,500,000', '1.5 million'],
      numeric: { value: 1_500_000, tolerance: 0 },
    });
    expect(gradeAnswer(mvpRegistry, population, typed('15 million'), context)).toEqual(incorrect());
  });

  it('R6: the shared fixtures for numbers inside a text answer', () => {
    expect(
      runFixtures(
        'number-separator-dropped',
        'number-separator-moved',
        'number-decimal-comma',
        'number-typo-beside',
        'minus-dropped',
        'minus-sign-for-hyphen',
        'hyphen-before-number',
        'hyphen-between-words',
      ).failures,
    ).toEqual([]);
  });

  it('R6a: a Roman numeral must match exactly, and a typo beside it is still forgiven', () => {
    const grade = (accepted: string, text: string) =>
      gradeAnswer(mvpRegistry, textQuestion({ accepted: [accepted] }), typed(text), context).status;

    expect(grade('Henry VIII', 'Henry VII')).toBe('incorrect');
    expect(grade('Louis XVI', 'Louis XIV')).toBe('incorrect');
    expect(grade('World War II', 'World War I')).toBe('incorrect');
    expect(grade('World War I', 'World War II')).toBe('incorrect');
    expect(grade('Super Bowl LIV', 'Super Bowl LV')).toBe('incorrect');
    // A numeral that is gone, or run into its neighbour, is no longer that numeral.
    expect(grade('Henry VIII', 'Henry')).toBe('incorrect');
    expect(grade('Henry VIII', 'HenryVIII')).toBe('incorrect');
    // One letter can be a numeral too: C is 100 and D is 500.
    expect(grade('Vitamin C', 'Vitamin D')).toBe('incorrect');

    expect(grade('Henry VIII', 'henry viii')).toBe('correct');
    expect(grade('Henry VIII', 'Hnery VIII')).toBe('correct');
    expect(grade('World War II', 'Wrold War II')).toBe('correct');
    expect(grade('Vitamin C', 'Vitamn C')).toBe('correct');
    // "Mississippi" is no numeral, and nor is a word that only holds numeral letters out of order.
    expect(grade('Mississippi', 'Missisippi')).toBe('correct');
    expect(grade('Vivid Dreams', 'Vivd Dreams')).toBe('correct');
  });

  it('R6a: the shared fixtures for Roman numerals', () => {
    expect(runFixtures('roman-numeral-differs', 'roman-numeral-typo-beside').failures).toEqual([]);
  });

  it('QT-03 typo thresholds are tunable', () => {
    const paris = textQuestion({ accepted: ['Paris'] });
    const iran = textQuestion({ accepted: ['Iran'] });

    expect(gradeAnswer(mvpRegistry, paris, typed('Parsi'), context)).toEqual(correct());
    expect(
      gradeAnswer(mvpRegistry, paris, typed('Parsi'), withTunables({ typoThresholds: [] })),
    ).toEqual(incorrect());

    expect(gradeAnswer(mvpRegistry, iran, typed('Iraq'), context)).toEqual(incorrect());
    expect(
      gradeAnswer(
        mvpRegistry,
        iran,
        typed('Iraq'),
        withTunables({ typoThresholds: [{ minLength: 3, maxEdits: 1 }] }),
      ),
    ).toEqual(correct());
  });

  it('R6: an author can lower the tolerance for one question, and never raise it', () => {
    const grade = (maxTypos: number, text: string) =>
      gradeAnswer(
        mvpRegistry,
        textQuestion({ accepted: ['Mississippi'], maxTypos }),
        typed(text),
        context,
      ).status;

    expect(grade(0, 'Mississipi')).toBe('incorrect');
    expect(grade(1, 'Mississipi')).toBe('correct');
    expect(grade(1, 'Missisipi')).toBe('incorrect');
    expect(grade(2, 'Missisipi')).toBe('correct');
    expect(grade(3, 'Misisipi')).toBe('incorrect');
  });

  it('R6: grading stops at 3 typos, whatever the tunables and the question allow', () => {
    // Values neither schema would pass: grading holds the cap itself and doesn't lean on them.
    const lenient = withTunables({ typoThresholds: [{ minLength: 5, maxEdits: 9 }] });
    const grade = (key: { maxTypos?: number }, text: string) =>
      gradeAnswer(
        mvpRegistry,
        textQuestion({ accepted: ['Mississippi'], ...key }),
        typed(text),
        lenient,
      ).status;

    expect(typeAnswerTunablesSchema.safeParse(lenient.tunables.type_answer).success).toBe(false);
    expect(issuePaths(textQuestion({ accepted: ['Mississippi'], maxTypos: 9 }))).toEqual([
      ['key', 'maxTypos'],
    ]);
    // Three letters left out, then four.
    expect(grade({}, 'Misisipi')).toBe('correct');
    expect(grade({}, 'Misisip')).toBe('incorrect');
    expect(grade({ maxTypos: 9 }, 'Misisipi')).toBe('correct');
    expect(grade({ maxTypos: 9 }, 'Misisip')).toBe('incorrect');
  });

  it('R11: a timed-out answer is unanswered, and submitted text that is empty is incorrect', () => {
    expect(runFixtures('unanswered', 'empty', 'spaces-only', 'punctuation-only').failures).toEqual(
      [],
    );
  });

  it('a number with a unit is read with any listed unit, at either end, in any case', () => {
    const question = numberQuestion({
      accepted: ['$5'],
      numeric: { value: 5, tolerance: 0, units: ['$', 'usd', 'dollars'] },
    });
    const grade = (text: string) => gradeAnswer(mvpRegistry, question, typed(text), context).status;

    for (const text of ['5', '$5', '5 $', '5 USD', 'usd 5', '5 Dollars', '５＄', '5,0 dollars']) {
      expect(grade(text), text).toBe('correct');
    }
    for (const text of ['6', '$6', '5 euros', '5 dollars usd', 'dollars', '$']) {
      expect(grade(text), text).toBe('incorrect');
    }
  });

  it('the longest listed unit is the one removed', () => {
    const question = numberQuestion({
      accepted: ['20 °C'],
      numeric: { value: 20, tolerance: 0.5, units: ['c', '°c', 'degrees c'] },
    });
    const grade = (text: string) => gradeAnswer(mvpRegistry, question, typed(text), context).status;

    for (const text of ['20', '20c', '20 °C', '20.5 degrees C', '19,5°c']) {
      expect(grade(text), text).toBe('correct');
    }
    expect(grade('21 °C')).toBe('incorrect');
  });

  it('QT-03 a number question judges text with a digit in it as a number, whatever its length', () => {
    const grade = (value: number, text: string) =>
      gradeAnswer(
        mvpRegistry,
        numberQuestion({ accepted: [String(value)], numeric: { value, tolerance: 0 } }),
        typed(text),
        context,
      ).status;

    // A dash that is no minus sign, typed in front of the number.
    for (const text of ['\u20135', '\u20145', '--5']) {
      expect(grade(5, text), text).toBe('incorrect');
    }
    // The sign is part of the number, whatever punctuation comes with it.
    for (const text of ['5', '5.', '5!', '(5)']) {
      expect(grade(-5, text), text).toBe('incorrect');
    }
    for (const text of ['-5', '\u22125', '- 5', '-5,0']) {
      expect(grade(-5, text), text).toBe('correct');
    }
    // Letters and symbols that are no listed unit, on an answer long enough to allow typos.
    for (const text of ['12345k', '12345%', '1e2345', '$12345', '12345.', '(12345)']) {
      expect(grade(12345, text), text).toBe('incorrect');
    }
    expect(grade(123_456_789, '123456789 m')).toBe('incorrect');
    expect(grade(123_456_789, '123456789')).toBe('correct');
  });

  it('QT-03 an unlisted unit is wrong at every key length, and a listed one is read', () => {
    const grade = (value: number, units: string[] | undefined, text: string) =>
      gradeAnswer(
        mvpRegistry,
        numberQuestion({
          accepted: [String(value)],
          numeric: { value, tolerance: 0, ...(units === undefined ? {} : { units }) },
        }),
        typed(text),
        context,
      ).status;

    // One character after the number, then two: within the typos a longer answer is allowed.
    for (const value of [7, 71, 71_000, 71_000_000, 123_456_789]) {
      for (const text of [`${String(value)}m`, `${String(value)} m`]) {
        expect(grade(value, undefined, text), text).toBe('incorrect');
        expect(grade(value, ['%', 'km'], text), text).toBe('incorrect');
        expect(grade(value, ['m'], text), text).toBe('correct');
      }
    }
    expect(grade(71, undefined, '71 km')).toBe('incorrect');
    expect(grade(71, ['km'], '71 km')).toBe('correct');
  });

  it('QT-03 the shared fixtures for a number question and text that is no number', () => {
    expect(
      runFixtures(
        'number-after-dash',
        'negative',
        'negative-minus-sign',
        'negative-sign-dropped',
        'number-then-letter',
        'unit-unlisted-long',
        'number-both-separators',
        'number-separators-alike',
        'number-alias-in-words',
      ).failures,
    ).toEqual([]);
  });

  it('on a number question, an alias with no digit in it is still matched as text', () => {
    const question = numberQuestion({
      accepted: ['1,000', 'one thousand', 'a thousand'],
      numeric: { value: 1000, tolerance: 0 },
    });
    const grade = (text: string) => gradeAnswer(mvpRegistry, question, typed(text), context).status;

    expect(grade('One Thousand')).toBe('correct');
    expect(grade('thousand')).toBe('correct');
    expect(grade('one thousnad')).toBe('correct');
    expect(grade('two thousand')).toBe('incorrect');
    // A number is judged as a number: one edit from "1,000" as text, and wrong.
    expect(grade('1,001')).toBe('incorrect');
    expect(grade('1,00')).toBe('incorrect');
    // So is a number with a word: one edit from "a thousand" as text, and no number at all.
    expect(grade('1 thousand')).toBe('incorrect');
  });

  it('on a number question, an alias with a digit in it matches only as the number it reads as', () => {
    const question = numberQuestion({
      accepted: ['1,500,000', '1.5 million', '1500000 people'],
      numeric: { value: 1_500_000, tolerance: 0, units: ['people'] },
    });
    const grade = (text: string) => gradeAnswer(mvpRegistry, question, typed(text), context).status;

    expect(grade('1.500.000')).toBe('correct');
    expect(grade('1500000 People')).toBe('correct');
    // "1.5 million" holds a digit and reads as no number, so listing it accepts nothing: write
    // the unit out ("million" can't be one here) or ask for the answer in millions.
    expect(grade('1.5 million')).toBe('incorrect');
    expect(grade('15 million')).toBe('incorrect');
  });

  it('a rejected entry is refused before the number is read', () => {
    const question = numberQuestion({
      accepted: ['12'],
      rejected: ['13'],
      numeric: { value: 12, tolerance: 1 },
    });
    const grade = (text: string) => gradeAnswer(mvpRegistry, question, typed(text), context).status;

    expect(grade('12')).toBe('correct');
    expect(grade('11')).toBe('correct');
    // Within the tolerance, and listed by the author as wrong.
    expect(grade('13')).toBe('incorrect');
  });
});

describe('type_answer and hostile input', () => {
  // The same module, except that reaching its grader is an error.
  const neverGrades = createRegistry([
    {
      ...typeAnswer,
      grade: () => {
        throw new Error('The grader was reached.');
      },
    },
  ]);
  const paris = textQuestion({ accepted: ['Paris'] });

  it('an answer over 256 UTF-16 units is malformed before the grader is reached', () => {
    const atTheCap = 'a'.repeat(maxResponseLength);
    const overTheCap = 'a'.repeat(maxResponseLength + 1);

    expect(maxResponseLength).toBe(256);
    expect(runFixtures('over-length', 'not-text', 'wrong-type').failures).toEqual([]);
    expect(gradeAnswer(neverGrades, paris, typed(overTheCap), context)).toEqual(
      invalid('malformed'),
    );
    expect(gradeAnswer(neverGrades, paris, typed('a'.repeat(10_000)), context)).toEqual(
      invalid('malformed'),
    );
    // Two UTF-16 units each: 129 of them are 258 units.
    expect(gradeAnswer(neverGrades, paris, typed('😀'.repeat(129)), context)).toEqual(
      invalid('malformed'),
    );
    expect(() => gradeAnswer(neverGrades, paris, typed(atTheCap), context)).toThrow(
      'The grader was reached.',
    );
    expect(gradeAnswer(mvpRegistry, paris, typed(atTheCap), context)).toEqual(incorrect());
  });

  it('a response with an extra property, or text that is not a string, is malformed', () => {
    for (const response of [{ text: 'Paris', score: 1 }, { text: ['Paris'] }, { text: null }, {}]) {
      const answer = { type: 'type_answer', response };

      expect(gradeAnswer(neverGrades, paris, answer, context)).toEqual(invalid('malformed'));
    }
  });

  it('the costliest answer the schemas allow is graded in bounded work', () => {
    // Twenty accepted and twenty rejected entries of full length. The answer is two edits from
    // every accepted entry, three from nineteen rejected ones, which differ only at the very
    // end, and one from the last: every pair is compared, over its whole length. Then an answer
    // made of the character that grows most under normalization.
    const stem = 'bcdfghjklm'.repeat(11);
    const letters = Array.from('abcdefghijklmnoprstu');
    const accepted = letters.map((letter) => `${stem}${letter}xxxxxxxxx`);
    const rejected = [
      ...letters.slice(1).map((letter) => `${stem}qxxxxxxyy${letter}`),
      `${stem}qxxxxxxxxy`,
    ];
    const question = textQuestion({ accepted, rejected });
    const nearEverything = `${stem}qxxxxxxxxz`;
    const expanding = String.fromCodePoint(0xfdfa).repeat(maxResponseLength);

    expect(accepted.every((entry) => entry.length === 120)).toBe(true);
    expect(rejected).toHaveLength(20);
    expect(issuePaths(question)).toEqual([]);
    expect(expanding.normalize('NFKD').length).toBe(18 * maxResponseLength);

    const started = Date.now();
    for (let run = 0; run < 20; run += 1) {
      expect(gradeAnswer(mvpRegistry, question, typed(nearEverything), context)).toEqual(
        incorrect(),
      );
      expect(gradeAnswer(mvpRegistry, question, typed(expanding), context)).toEqual(incorrect());
    }
    // Forty gradings. A grader that compared without a band or a cap would take seconds each.
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

describe('type_answer questions', () => {
  it('accepts a text key and a number key', () => {
    expect(issuePaths(textQuestion({ accepted: ['Paris'] }))).toEqual([]);
    expect(
      issuePaths(textQuestion({ accepted: ['Australia'], rejected: ['Austria'], maxTypos: 1 })),
    ).toEqual([]);
    expect(
      issuePaths(
        numberQuestion({
          accepted: ['71%'],
          numeric: { value: 71, tolerance: 1, units: ['%', 'percent'] },
        }),
      ),
    ).toEqual([]);
    expect(
      issuePaths(numberQuestion({ accepted: ['-0.5'], numeric: { value: -0.5, tolerance: 0 } })),
    ).toEqual([]);
  });

  it("the schema refuses a key it can't grade", () => {
    const twentyOne = Array.from({ length: 21 }, (_, index) => `answer ${String(index)}`);
    const numeric = { value: 5, tolerance: 0 };

    expect(issuePaths(textQuestion({ accepted: [] }))).toEqual([['key', 'accepted']]);
    expect(issuePaths(textQuestion({}))).toEqual([['key', 'accepted']]);
    expect(issuePaths(textQuestion({ accepted: twentyOne }))).toEqual([['key', 'accepted']]);
    expect(issuePaths(textQuestion({ accepted: ['x'.repeat(121)] }))).toEqual([
      ['key', 'accepted', 0],
    ]);
    expect(issuePaths(textQuestion({ accepted: ['x'.repeat(120)] }))).toEqual([]);
    expect(issuePaths(textQuestion({ accepted: [''] }))).toEqual([['key', 'accepted', 0]]);
    expect(issuePaths(textQuestion({ accepted: ['Paris'], rejected: twentyOne }))).toEqual([
      ['key', 'rejected'],
    ]);
    expect(issuePaths(textQuestion({ accepted: ['Paris'], rejected: ['x'.repeat(121)] }))).toEqual([
      ['key', 'rejected', 0],
    ]);

    // The format and the key must agree, or the app would show the wrong keyboard.
    expect(issuePaths(numberQuestion({ accepted: ['5'] }))).toEqual([['key', 'numeric']]);
    expect(issuePaths(textQuestion({ accepted: ['5'], numeric }))).toEqual([['payload', 'format']]);
    expect(
      issuePaths({ type: 'type_answer', payload: { format: 'date' }, key: { accepted: ['5'] } }),
    ).toEqual([['payload', 'format']]);

    for (const tolerance of [-0.1, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      expect(
        issuePaths(numberQuestion({ accepted: ['5'], numeric: { value: 5, tolerance } })),
        String(tolerance),
      ).toEqual([['key', 'numeric', 'tolerance']]);
    }
    for (const value of [Number.NaN, Number.NEGATIVE_INFINITY, '5']) {
      expect(
        issuePaths(numberQuestion({ accepted: ['5'], numeric: { value, tolerance: 0 } })),
        String(value),
      ).toEqual([['key', 'numeric', 'value']]);
    }
    expect(
      issuePaths(numberQuestion({ accepted: ['5'], numeric: { ...numeric, units: [''] } })),
    ).toEqual([['key', 'numeric', 'units', 0]]);

    for (const maxTypos of [-1, 1.5, '1']) {
      expect(issuePaths(textQuestion({ accepted: ['Paris'], maxTypos })), String(maxTypos)).toEqual(
        [['key', 'maxTypos']],
      );
    }

    // Nothing a player types can match an answer that normalizes to nothing.
    expect(issuePaths(textQuestion({ accepted: ['Paris', '!!!'] }))).toEqual([
      ['key', 'accepted', 1],
    ]);
    expect(issuePaths(textQuestion({ accepted: ['  '] }))).toEqual([['key', 'accepted', 0]]);

    // An answer can't be right and wrong at once, however it is cased or accented.
    expect(issuePaths(textQuestion({ accepted: ['Austria'], rejected: ['Austria'] }))).toEqual([
      ['key', 'rejected', 0],
    ]);
    expect(
      issuePaths(
        textQuestion({ accepted: ['Australia', 'Österreich'], rejected: ['osterreich.'] }),
      ),
    ).toEqual([['key', 'rejected', 0]]);
  });

  it('the schema refuses a maxTypos above the 3 edits that grading honours', () => {
    const withMaxTypos = (maxTypos: number) =>
      issuePaths(textQuestion({ accepted: ['Mississippi'], maxTypos }));

    expect(withMaxTypos(0)).toEqual([]);
    expect(withMaxTypos(3)).toEqual([]);
    // Grading never allows more than 3, so a larger value would only appear to raise the tolerance.
    expect(withMaxTypos(4)).toEqual([['key', 'maxTypos']]);
    expect(withMaxTypos(99)).toEqual([['key', 'maxTypos']]);
  });

  it('a key over its caps is refused for its size alone, before its entries are compared', () => {
    const many = Array.from({ length: 5_000 }, () => '!!!');

    expect(issuePaths(textQuestion({ accepted: many, rejected: many }))).toEqual([
      ['key', 'accepted'],
      ['key', 'rejected'],
    ]);
  });

  it('refuses properties the schemas do not name', () => {
    expect(issuePaths(textQuestion({ accepted: ['Paris'], hint: 'France' }))).toEqual([['key']]);
    expect(
      issuePaths({
        type: 'type_answer',
        payload: { format: 'text', placeholder: 'City' },
        key: { accepted: ['Paris'] },
      }),
    ).toEqual([['payload']]);
    expect(
      issuePaths(
        numberQuestion({ accepted: ['5'], numeric: { value: 5, tolerance: 0, unit: '%' } }),
      ),
    ).toEqual([['key', 'numeric']]);
  });
});

describe('type_answer tunables', () => {
  const refuses = (changes: Record<string, unknown>): boolean =>
    !typeAnswerTunablesSchema.safeParse({ ...specTypeAnswerTunables, ...changes }).success;

  it('the spec values are data that passes its own schema, and typos can be switched off', () => {
    expect(specTypeAnswerTunables).toEqual({
      articles: { en: ['the', 'a', 'an'] },
      typoThresholds: [
        { minLength: 5, maxEdits: 1 },
        { minLength: 9, maxEdits: 2 },
      ],
    });
    expect(typeAnswerTunablesSchema.parse(specTypeAnswerTunables)).toEqual(specTypeAnswerTunables);
    expect(Object.isFrozen(specTypeAnswerTunables)).toBe(true);
    expect(mvpRegistry.tunablesSchema.parse(specMvpTunables)).toEqual(specMvpTunables);
    expect(refuses({ typoThresholds: [] })).toBe(false);
    expect(refuses({ articles: {} })).toBe(false);
  });

  it('the tunables schema refuses thresholds out of order, maxEdits above 3 and an article containing a space', () => {
    const inOrder = [
      { minLength: 5, maxEdits: 1 },
      { minLength: 9, maxEdits: 2 },
    ];

    expect(refuses({ typoThresholds: inOrder })).toBe(false);
    expect(refuses({ typoThresholds: [...inOrder].reverse() })).toBe(true);
    expect(refuses({ typoThresholds: [inOrder[0], inOrder[0]] })).toBe(true);
    expect(refuses({ typoThresholds: [{ minLength: 9, maxEdits: 4 }] })).toBe(true);
    expect(refuses({ typoThresholds: [{ minLength: 9, maxEdits: 3 }] })).toBe(false);
    expect(refuses({ articles: { es: ['la paz'] } })).toBe(true);
    expect(refuses({ articles: { es: ['la'] } })).toBe(false);
  });

  it('the tunables schema refuses values that could never apply or would forgive anything', () => {
    // More edits than letters: any short answer would be correct.
    expect(refuses({ typoThresholds: [{ minLength: 2, maxEdits: 2 }] })).toBe(true);
    for (const threshold of [
      { minLength: 0, maxEdits: 0 },
      { minLength: 5, maxEdits: -1 },
      { minLength: 5.5, maxEdits: 1 },
      { minLength: 5, maxEdits: 1.5 },
      { minLength: 5 },
      { minLength: 5, maxEdits: 1, maxLength: 8 },
    ]) {
      expect(refuses({ typoThresholds: [threshold] }), JSON.stringify(threshold)).toBe(true);
    }
    // An article is matched against normalized text, so one that isn't written that way never
    // matches; a language is looked up by its lower-case primary subtag.
    for (const articles of [
      { en: ['The'] },
      { fr: ["l'"] },
      { en: [''] },
      { EN: ['the'] },
      { 'en-GB': ['the'] },
    ]) {
      expect(refuses({ articles }), JSON.stringify(articles)).toBe(true);
    }
    expect(refuses({ extra: true })).toBe(true);
    expect(typeAnswerTunablesSchema.safeParse({}).success).toBe(false);
  });
});

describe('type_answer properties', () => {
  const entry = fc
    .array(answerWord, { minLength: 1, maxLength: 3 })
    .map((words) => words.join(' '));
  const questionLocale = fc.constantFrom('en', 'en-GB', 'es', 'pt-BR', 'hi');
  const recased = fc.constantFrom(
    (text: string) => text,
    (text: string) => text.toUpperCase(),
    (text: string) => text.toLowerCase(),
  );
  const padding = fc.constantFrom('', ' ', '  ', '\t', '\n');

  it('a surface variant of an accepted answer is correct', () => {
    const cases = fc.record({
      accepted: fc.uniqueArray(entry, { minLength: 1, maxLength: 3 }),
      pick: fc.nat({ max: 2 }),
      recase: recased,
      before: padding,
      after: padding,
      article: fc.boolean(),
      locale: questionLocale,
    });

    fc.assert(
      fc.property(cases, ({ accepted, pick, recase, before, after, article, locale }) => {
        const chosen = accepted[pick % accepted.length] ?? '';
        // No generated entry begins with an article, so "the " in front is one more variant
        // where the content is English.
        const prefix = article && locale.startsWith('en') ? 'the ' : '';
        const text = `${before}${recase(`${prefix}${chosen}`)}${after}`;

        expect(
          gradeAnswer(mvpRegistry, textQuestion({ accepted }), typed(text), {
            locale,
            tunables: specMvpTunables,
          }),
        ).toEqual(correct());
      }),
      { numRuns: 500 },
    );
  });

  it("a typo is never forgiven across a number's separator or sign", () => {
    const cases = fc
      .record({
        before: fc.array(answerWord, { maxLength: 2 }),
        whole: fc.stringMatching(/^[1-9][0-9]{1,3}$/),
        fraction: fc.stringMatching(/^[0-9]{1,2}$/),
        after: fc.array(answerWord, { minLength: 1, maxLength: 2 }),
        change: fc.constantFrom('drop the separator', 'move the separator', 'add a minus'),
        locale: questionLocale,
      })
      .map(({ before, whole, fraction, after, change, locale }) => {
        const number = `${whole}.${fraction}`;
        const changed = {
          'drop the separator': `${whole}${fraction}`,
          'move the separator': `${whole.slice(0, -1)}.${whole.slice(-1)}${fraction}`,
          'add a minus': `-${number}`,
        }[change];
        // The number comes first or after a space, so a minus in front of it begins it.
        const around = (middle: string) => [...before, middle, ...after].join(' ');

        return { accepted: around(number), text: around(changed), locale };
      });

    fc.assert(
      fc.property(cases, ({ accepted, text, locale }) => {
        const grade = (key: string, answer: string) =>
          gradeAnswer(mvpRegistry, textQuestion({ accepted: [key] }), typed(answer), {
            locale,
            tunables: specMvpTunables,
          });

        expect(grade(accepted, text)).toEqual(incorrect());
        expect(grade(text, accepted)).toEqual(incorrect());
      }),
      { numRuns: 500 },
    );
  });

  it('a typo is never forgiven across digits', () => {
    const digits = '0123456789';
    const cases = fc
      .record({
        before: fc.array(answerWord, { maxLength: 2 }),
        number: fc.stringMatching(/^[0-9]{1,4}$/),
        after: fc.array(answerWord, { maxLength: 2 }),
        at: fc.nat({ max: 3 }),
        shift: fc.integer({ min: 1, max: 9 }),
        locale: questionLocale,
      })
      .map(({ before, number, after, at, shift, locale }) => {
        const index = at % number.length;
        const changedDigit = digits[(digits.indexOf(number[index] ?? '0') + shift) % 10] ?? '0';
        const changed = `${number.slice(0, index)}${changedDigit}${number.slice(index + 1)}`;
        const around = (middle: string) => [...before, middle, ...after].join(' ');

        return { accepted: around(number), text: around(changed), locale };
      });

    fc.assert(
      fc.property(cases, ({ accepted, text, locale }) => {
        expect(text).not.toBe(accepted);
        expect(
          gradeAnswer(mvpRegistry, textQuestion({ accepted: [accepted] }), typed(text), {
            locale,
            tunables: specMvpTunables,
          }),
        ).toEqual(incorrect());
      }),
      { numRuns: 500 },
    );
  });
});
