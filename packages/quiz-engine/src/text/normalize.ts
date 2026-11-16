// Normalizing a typed answer (spec QT-03): case, diacritics, whitespace, punctuation and leading
// articles, so that "the  BEATLES." and "Beatles" compare equal. It reads no locale from the
// environment: the question's content language is passed in, and only to choose the articles.
// Every step is one pass over the text, so the work grows in line with its length.

/** The leading articles of each content language, keyed by primary language subtag ("en"). */
export type ArticlesByLanguage = Readonly<Record<string, readonly string[]>>;

// Combining marks used with Latin, Greek and Cyrillic letters. Marks that carry meaning in other
// scripts (Devanagari vowel signs, Arabic harakat) sit outside these blocks and are kept.
// One class per block: two marks side by side in one class read as a single combined character.
const COMBINING_MARKS =
  /[\u0300-\u036f]|[\u1ab0-\u1aff]|[\u1dc0-\u1dff]|[\u20d0-\u20ff]|[\ufe20-\ufe2f]/g;

/** Letters with no decomposition, and the plain letters a player types for them. */
const letterFolds: Readonly<Record<string, string>> = Object.freeze({
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  æ: 'ae',
  œ: 'oe',
  ħ: 'h',
  ŧ: 't',
});
const FOLDED_LETTERS = new RegExp(`[${Object.keys(letterFolds).join('')}]`, 'g');

// The underscore and both slashes join words, so they separate them here.
const WORD_JOINERS = /[_/\\]/g;

// Hyphens, dashes and the minus sign. One separates words too, unless it begins a number.
const DASHES = /[-\u2010-\u2015\u2212]/g;
const isDash = (character: string): boolean => /^[-\u2010-\u2015\u2212]$/.test(character);

// Punctuation and quotation marks that carry no part of an answer, and characters that can't be
// seen: the soft hyphen, zero-width spaces and joiners, direction marks, the word joiner and the
// byte order mark.
const IGNORED =
  /[;:!?\u00a1\u00bf'\u2019\u2018\u201b"\u201c\u201d\u201e\u00ab\u00bb`\u00b4()[\]{}\u2026\u00b7\u00ad\u200b-\u200f\u2060\ufeff]/g;

const DOT_OR_COMMA = /[.,]/g;

const isAsciiDigit = (character: string | undefined): boolean =>
  character !== undefined && character >= '0' && character <= '9';

/**
 * Whether the dash at `offset` is the sign of a number: a digit follows it, and nothing, a space
 * or another dash comes before it. "-40" keeps its minus, and "Apollo-11" and "1939-1945" don't
 * gain one. It is asked once everything that gets removed is gone, so the answer is the same
 * when the text is normalized again.
 */
function beginsNumber(text: string, offset: number): boolean {
  const before = text[offset - 1];
  return (
    isAsciiDigit(text[offset + 1]) && (before === undefined || /\s/.test(before) || isDash(before))
  );
}

/**
 * Lower case with no locale. Lower, upper, lower folds "ß" with "SS" and "İ" with "i". Lower-casing
 * writes a sigma as "ς" or "σ" by what follows it, and later steps change what follows, so the
 * final form is folded into the other.
 */
const foldCase = (text: string): string =>
  text.toLowerCase().toUpperCase().toLowerCase().replace(/ς/g, 'σ');

/**
 * Steps 1 to 4: compatibility forms, case, diacritics and the letters that don't decompose. The
 * text is decomposed once: folding case puts no composed character back and moves no mark.
 */
const foldLetters = (text: string): string =>
  foldCase(text.normalize('NFKD'))
    .replace(COMBINING_MARKS, '')
    .replace(FOLDED_LETTERS, (letter) => letterFolds[letter] ?? letter);

/** The articles of the locale's language, or none. An inherited name such as "constructor" finds nothing. */
function articlesFor(locale: string, articles: ArticlesByLanguage): readonly string[] {
  const language = locale.toLowerCase().split(/[-_]/, 1)[0] ?? '';
  return Object.prototype.hasOwnProperty.call(articles, language) ? (articles[language] ?? []) : [];
}

/**
 * The form in which two typed answers are compared. `locale` is the question's content language
 * as BCP 47; only its primary subtag is read, to look up `articles`.
 */
export function normalizeAnswerText(
  text: string,
  locale: string,
  articles: ArticlesByLanguage,
): string {
  const words = foldLetters(text)
    .replace(WORD_JOINERS, ' ')
    .replace(IGNORED, '')
    // A dot or comma is part of the answer only inside a number: "3.14" must not become "314".
    .replace(DOT_OR_COMMA, (mark, offset: number, whole: string) =>
      isAsciiDigit(whole[offset - 1]) && isAsciiDigit(whole[offset + 1]) ? mark : '',
    )
    // A minus is part of the answer only in front of a number: "-40" must not become "40".
    .replace(DASHES, (_dash, offset: number, whole: string) =>
      beginsNumber(whole, offset) ? '-' : ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  // An article goes only when a space and more text follow it: "A" and "Theatre" stay whole.
  // Every leading article goes, not just the first, so "The A-Team" and "A-Team" compare equal.
  const leading = articlesFor(locale, articles);
  const articleAt = (start: number): string | undefined =>
    leading.find((article) => words.startsWith(`${article} `, start));

  let start = 0;
  for (let article = articleAt(start); article !== undefined; article = articleAt(start)) {
    start += article.length + 1;
  }
  return words.slice(start);
}
