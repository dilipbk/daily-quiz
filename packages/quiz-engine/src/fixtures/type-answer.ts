import type { GradingFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import type { Grade } from '../core/module.ts';
import type { Question } from '../types/index.ts';
import { specTypeAnswerTunables } from '../types/type-answer.ts';

// Typed answers (spec QT-03): what normalization forgives, what an alias, a number and a typo
// are worth, and the near-misses that must stay wrong. Each group is one question, named by the
// answers its key accepts.

const textQuestion = (accepted: string[], rest: { rejected?: string[]; maxTypos?: number } = {}) =>
  ({
    type: 'type_answer',
    payload: { format: 'text' },
    key: { accepted, ...rest },
  }) satisfies Question;

const numberQuestion = (
  accepted: string[],
  numeric: { value: number; tolerance: number; units?: string[] },
) =>
  ({
    type: 'type_answer',
    payload: { format: 'number' },
    key: { accepted, numeric },
  }) satisfies Question;

const typed = (text: unknown) => ({ type: 'type_answer', response: { text } });

type Case = readonly [name: string, answer: unknown, expected: Grade];

/** One fixture per row, all on the same question. The locale is English unless given. */
const cases = (
  question: Question,
  rows: readonly Case[],
  context: { locale?: string; tunables?: unknown } = {},
): GradingFixture[] =>
  rows.map(([name, answer, expected]) => ({
    id: `type_answer/${name}`,
    cites: ['QT-03'],
    question,
    locale: context.locale ?? 'en',
    answer,
    ...(context.tunables === undefined ? {} : { tunables: context.tunables }),
    expected,
  }));

/** The spec's tunables with a Spanish article table beside the English one. */
const withSpanishArticles = {
  type_answer: {
    ...specTypeAnswerTunables,
    articles: { ...specTypeAnswerTunables.articles, es: ['el', 'la', 'los', 'las'] },
  },
};

export const typeAnswerFixtures: readonly GradingFixture[] = [
  ...cases(textQuestion(['Paris']), [
    ['exact', typed('Paris'), correct()],
    ['case-and-space', typed('  PARIS '), correct()],
    ['diacritics', typed('París'), correct()],
    ['punctuation', typed('Paris.'), correct()],
    // One slip in a five-letter answer is forgiven: two letters swapped, or one left out.
    ['typo-swap', typed('Parsi'), correct()],
    ['typo-drop', typed('Pais'), correct()],
    ['wrong', typed('Lyon'), incorrect()],
    // Submitted with nothing in it: an answer, and a wrong one. Only a timeout is unanswered.
    ['empty', typed(''), incorrect()],
    ['spaces-only', typed('   '), incorrect()],
    ['punctuation-only', typed('!!!'), incorrect()],
    ['unanswered', null, unanswered()],
    // Longer than any answer the app can send: refused before it is compared with anything.
    ['over-length', typed('a'.repeat(257)), invalid('malformed')],
    ['not-text', typed(5), invalid('malformed')],
    [
      'wrong-type',
      { type: 'single_choice', response: { optionId: 'a' } },
      invalid('type_mismatch'),
    ],
  ]),

  ...cases(textQuestion(['The Beatles', 'Beatles']), [
    ['leading-article', typed('beatles'), correct()],
    ['alias', typed('Beatles'), correct()],
  ]),
  // "The" is an article in English only: Spanish content keeps it.
  ...cases(
    textQuestion(['The Beatles']),
    [['article-other-locale', typed('Beatles'), incorrect()]],
    {
      locale: 'es',
    },
  ),
  ...cases(textQuestion(['La Paz']), [['article-from-tunables', typed('Paz'), correct()]], {
    locale: 'es-BO',
    tunables: withSpanishArticles,
  }),

  // Eleven letters allow two slips, and no more.
  ...cases(textQuestion(['Mississippi']), [
    ['typo-two-edits', typed('Missisipi'), correct()],
    ['typo-three-edits', typed('Misisipi'), incorrect()],
  ]),
  // Four letters allow none: one letter away is another country.
  ...cases(textQuestion(['Iran']), [['short-answer-no-typos', typed('Iraq'), incorrect()]]),
  // A slip is never forgiven in a digit.
  ...cases(textQuestion(['Apollo 11']), [
    ['digits-differ', typed('Apollo 12'), incorrect()],
    ['digits-same', typed('Apolo 11'), correct()],
  ]),
  // Nor inside a number in any other way: the separator in it and its sign are part of it.
  ...cases(textQuestion(['1.5 million']), [
    ['number-separator-dropped', typed('15 million'), incorrect()],
    ['number-separator-moved', typed('.15 million'), incorrect()],
    // A decimal comma is the same number, and a slip beside a number is still a slip.
    ['number-decimal-comma', typed('1,5 million'), correct()],
    ['number-typo-beside', typed('1.5 milion'), correct()],
  ]),
  // A minus that begins a number is kept, whichever dash is typed for it. A hyphen that begins
  // none only joins words.
  ...cases(textQuestion(['-40 degrees']), [
    ['minus-dropped', typed('40 degrees'), incorrect()],
    ['minus-sign-for-hyphen', typed('\u221240 degrees'), correct()],
  ]),
  ...cases(textQuestion(['Apollo-11']), [['hyphen-before-number', typed('Apollo 11'), correct()]]),
  ...cases(textQuestion(['Jean-Paul']), [['hyphen-between-words', typed('Jean Paul'), correct()]]),
  // A near-miss the author listed: wrong when typed exactly, and wrong when a slip is as close
  // to it as to the answer.
  ...cases(textQuestion(['Australia'], { rejected: ['Austria'] }), [
    ['rejected-near-miss', typed('Austria'), incorrect()],
    ['tie-with-rejected', typed('Austrlia'), incorrect()],
    ['typo-clear-of-rejected', typed('Australa'), correct()],
  ]),
  ...cases(textQuestion(['Mississippi'], { maxTypos: 0 }), [
    ['typos-off', typed('Missisippi'), incorrect()],
  ]),
  ...cases(textQuestion(['Łódź']), [['letter-fold', typed('Lodz'), correct()]]),
  ...cases(textQuestion(['C++']), [
    ['symbols-kept', typed('C'), incorrect()],
    ['symbols-exact', typed('c++'), correct()],
  ]),

  // Numbers are read with no locale: either separator may group thousands or mark the decimals.
  ...cases(numberQuestion(['1,000'], { value: 1000, tolerance: 0 }), [
    ['number-plain', typed('1000'), correct()],
    ['grouping-comma', typed('1,000'), correct()],
    ['grouping-dot', typed('1.000'), correct()],
    ['grouping-space', typed('1 000'), correct()],
    ['number-trailing-zero', typed('1000.0'), correct()],
    ['number-plus-sign', typed('+1000'), correct()],
    ['number-off', typed('1001'), incorrect()],
    ['number-words', typed('one thousand'), incorrect()],
  ]),
  ...cases(numberQuestion(['1,000', 'one thousand'], { value: 1000, tolerance: 0 }), [
    ['number-alias-in-words', typed('One Thousand'), correct()],
  ]),
  // Text with a digit in it is judged as a number and as nothing else, at any length: a dash
  // that is no minus, a sign left out and a letter that is no listed unit are all wrong.
  ...cases(numberQuestion(['5'], { value: 5, tolerance: 0 }), [
    ['number-after-dash', typed('\u20135'), incorrect()],
  ]),
  ...cases(numberQuestion(['-5'], { value: -5, tolerance: 0 }), [
    ['negative', typed('-5'), correct()],
    ['negative-minus-sign', typed('\u22125'), correct()],
    ['negative-sign-dropped', typed('(5)'), incorrect()],
  ]),
  ...cases(numberQuestion(['123456789'], { value: 123456789, tolerance: 0 }), [
    ['number-then-letter', typed('123456789k'), incorrect()],
    ['unit-unlisted-long', typed('123456789 m'), incorrect()],
  ]),
  // Off the tolerance, and one character from the answer as text: "1.234.5" reads as 12345.
  ...cases(numberQuestion(['1,234.5'], { value: 1234.5, tolerance: 0 }), [
    ['number-both-separators', typed('1.234,5'), correct()],
    ['number-separators-alike', typed('1.234.5'), incorrect()],
  ]),
  ...cases(numberQuestion(['3.14'], { value: 3.14, tolerance: 0.01 }), [
    ['decimal-comma', typed('3,14'), correct()],
    ['tolerance-edge', typed('3.15'), correct()],
    ['tolerance-out', typed('3.16'), incorrect()],
    // A typed number is judged as a number, never as a slip of the keyboard.
    ['separator-dropped', typed('314'), incorrect()],
  ]),
  // 0.4 − 0.3 is a hair over 0.1 in binary. The bound is inclusive all the same.
  ...cases(numberQuestion(['0.3'], { value: 0.3, tolerance: 0.1 }), [
    ['binary-rounding', typed('0.4'), correct()],
    ['binary-rounding-out', typed('0.41'), incorrect()],
  ]),
  ...cases(numberQuestion(['71%'], { value: 71, tolerance: 1, units: ['%', 'percent'] }), [
    ['unit-symbol', typed('71%'), correct()],
    ['unit-suffix', typed('70 percent'), correct()],
    ['unit-unlisted', typed('71 km'), incorrect()],
    ['unit-out', typed('72.5%'), incorrect()],
  ]),
];
