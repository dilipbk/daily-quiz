import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { editDistance } from '../../src/text/edit-distance.ts';
import { normalizeAnswerText } from '../../src/text/normalize.ts';
import { parseNumberReadings } from '../../src/text/number.ts';

const articles = { en: ['the', 'a', 'an'], es: ['el', 'la', 'los', 'las'] };
const locale = fc.constantFrom('en', 'en-GB', 'es', 'es-MX', 'hi', '');

/** Characters the steps of normalization treat differently, so that short strings exercise them. */
const answerAlphabet = Array.from(
  "aAtThHeElL  ..,,''--__//19ßsSΣσςİıiIéÉøØþ\u0301\u0307\u0345\u00ad\u200b\u00a0…·()!?+#",
);

// A Greek iota subscript, then a Cyrillic mark that normalization keeps: the one shape of text
// whose upper case, taken before the text is in canonical form, is a different text.
const iotaSubscriptThenTitlo = String.fromCodePoint(0x3b1, 0x345, 0x483);

/** Any text a player could send: graphemes, any code points, lone surrogates, answer-like strings. */
const anyText = fc.oneof(
  fc.string({ unit: 'grapheme' }),
  fc.string({ unit: 'binary' }),
  fc.string({ unit: fc.constantFrom(...answerAlphabet), maxLength: 12 }),
  fc.constantFrom(
    '\uD800',
    'a\uDFFFb',
    'The The The',
    'ΑΣ(Α',
    '1.,2',
    iotaSubscriptThenTitlo,
    '3\u200b.14',
  ),
);

describe('normalizeAnswerText properties', () => {
  const normalize = (text: string, questionLocale: string): string =>
    normalizeAnswerText(text, questionLocale, articles);

  it('normalization is idempotent', () => {
    fc.assert(
      fc.property(anyText, locale, (text, questionLocale) => {
        const once = normalize(text, questionLocale);

        expect(normalize(once, questionLocale)).toBe(once);
      }),
      { numRuns: 2000 },
    );
  });

  it('normalization ignores letter case', () => {
    fc.assert(
      fc.property(anyText, locale, (text, questionLocale) => {
        const expected = normalize(text, questionLocale);
        // Upper-cased from its canonical form. Upper-casing turns an iota subscript into a letter
        // where it stands, so on text in another order a mark after it lands on that letter: a
        // different text, by Unicode's own rules, and not one a keyboard produces.
        const upperCased = text.normalize('NFD').toUpperCase();

        expect(normalize(upperCased, questionLocale)).toBe(expected);
        expect(normalize(text.toLowerCase(), questionLocale)).toBe(expected);
      }),
      { numRuns: 2000 },
    );
  });

  it('normalization gives the same result for the NFC and NFD forms of a string', () => {
    fc.assert(
      fc.property(anyText, locale, (text, questionLocale) => {
        expect(normalize(text.normalize('NFC'), questionLocale)).toBe(
          normalize(text.normalize('NFD'), questionLocale),
        );
      }),
      { numRuns: 2000 },
    );
  });

  it('normalized text has no leading, trailing or doubled spaces', () => {
    fc.assert(
      fc.property(anyText, locale, (text, questionLocale) => {
        const normalized = normalize(text, questionLocale);

        expect(normalized).toBe(normalized.trim());
        expect(normalized).not.toMatch(/\s\s/);
        expect(normalized).not.toMatch(/[^\S ]/);
      }),
      { numRuns: 2000 },
    );
  });

  it('normalization never throws, lone surrogates included', () => {
    fc.assert(
      fc.property(anyText, locale, (text, questionLocale) => {
        expect(typeof normalize(text, questionLocale)).toBe('string');
      }),
      { numRuns: 2000 },
    );
  });
});

describe('editDistance properties', () => {
  /** Optimal string alignment over code points, as a plain full table with no cut-off. */
  const reference = (a: string, b: string): number => {
    const from = Array.from(a);
    const to = Array.from(b);
    const table = Array.from({ length: from.length + 1 }, (_, i) =>
      Array.from({ length: to.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    const cell = (i: number, j: number): number => table[i]?.[j] ?? Number.POSITIVE_INFINITY;

    for (let i = 1; i <= from.length; i += 1) {
      for (let j = 1; j <= to.length; j += 1) {
        const cost = from[i - 1] === to[j - 1] ? 0 : 1;
        let best = Math.min(cell(i - 1, j) + 1, cell(i, j - 1) + 1, cell(i - 1, j - 1) + cost);
        if (i > 1 && j > 1 && from[i - 1] === to[j - 2] && from[i - 2] === to[j - 1]) {
          best = Math.min(best, cell(i - 2, j - 2) + 1);
        }
        const row = table[i];
        if (row !== undefined) row[j] = best;
      }
    }
    return cell(from.length, to.length);
  };

  // A small alphabet makes near-misses and swaps common; the other draws cover any code point.
  const word = fc.oneof(
    fc.string({ unit: fc.constantFrom('a', 'b', 'c'), maxLength: 9 }),
    fc.string({ unit: 'grapheme', maxLength: 9 }),
    fc.string({ unit: 'binary', maxLength: 9 }),
  );
  /** A word and a copy of it with a few edits: pairs that sit close to the cut-off. */
  const nearPair = word.chain((original) =>
    fc
      .array(
        fc.record({
          at: fc.nat({ max: 9 }),
          edit: fc.constantFrom('insert', 'delete', 'swap', 'replace'),
        }),
        { maxLength: 4 },
      )
      .map((edits) => {
        const points = Array.from(original);
        for (const { at, edit } of edits) {
          const index = Math.min(at, points.length);
          if (edit === 'insert') points.splice(index, 0, 'a');
          else if (edit === 'delete') points.splice(index, 1);
          else if (edit === 'replace') points.splice(index, 1, 'b');
          else points.splice(index, 2, ...points.slice(index, index + 2).reverse());
        }
        return [original, points.join('')] as const;
      }),
  );
  const pair = fc.oneof(fc.tuple(word, word), nearPair);
  const max = fc.integer({ min: 0, max: 4 });

  it('editDistance is symmetric, is 0 exactly for equal strings, and agrees with an unbounded reference when the result is ≤ max', () => {
    fc.assert(
      fc.property(pair, max, ([a, b], cutOff) => {
        const distance = editDistance(a, b, cutOff);
        const unbounded = reference(a, b);

        expect(distance).toBe(editDistance(b, a, cutOff));
        expect(distance === 0).toBe(a === b);
        expect(distance).toBe(unbounded <= cutOff ? unbounded : cutOff + 1);
      }),
      { numRuns: 3000 },
    );
  });
});

describe('parseNumberReadings properties', () => {
  const grouped = (digits: string, separator: string): string =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  const written = fc
    .record({
      negative: fc.boolean(),
      whole: fc.nat({ max: 999_999_999 }).map(String),
      fraction: fc.stringMatching(/^[0-9]{0,6}$/),
    })
    .map(({ negative, whole, fraction }) => {
      const sign = negative ? '-' : '';
      const withFraction = (separator: string): string =>
        fraction === '' ? '' : `${separator}${fraction}`;
      const plain = `${sign}${whole}${withFraction('.')}`;

      return {
        value: Number(plain),
        plain,
        english: `${sign}${grouped(whole, ',')}${withFraction('.')}`,
        german: `${sign}${grouped(whole, '.')}${withFraction(',')}`,
        swiss: `${sign}${grouped(whole, '\u2019')}${withFraction('.')}`,
        french: `${sign}${grouped(whole, '\u202f')}${withFraction(',')}`,
      };
    });

  it('a number written in English, German or plain form is among its own readings', () => {
    fc.assert(
      fc.property(written, ({ value, ...forms }) => {
        for (const form of Object.values(forms)) {
          expect(parseNumberReadings(form), form).toContain(value);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('parseNumberReadings never throws and returns at most two finite numbers', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          anyText,
          fc.string({ unit: fc.constantFrom(...Array.from('0123456789.,+- ')), maxLength: 12 }),
        ),
        (text) => {
          const readings = parseNumberReadings(text);

          expect(readings.length).toBeLessThanOrEqual(2);
          expect(readings.every(Number.isFinite)).toBe(true);
        },
      ),
      { numRuns: 2000 },
    );
  });
});
