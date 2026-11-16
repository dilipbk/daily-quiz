import { describe, expect, it } from 'vitest';
import { normalizeAnswerText } from '../../src/text/normalize.ts';

const en = { en: ['the', 'a', 'an'] };
const es = { es: ['el', 'la', 'los', 'las'] };

const normalize = (
  text: string,
  locale = 'en',
  articles: Readonly<Record<string, readonly string[]>> = en,
): string => normalizeAnswerText(text, locale, articles);

describe('normalizeAnswerText', () => {
  it('QT-03 case', () => {
    expect(normalize('PARIS')).toBe('paris');
    expect(normalize('Straße')).toBe('strasse');
    expect(normalize('STRASSE')).toBe('strasse');
    expect(normalize('İstanbul')).toBe('istanbul');
    expect(normalize('ΟΔΟΣ')).toBe(normalize('οδος'));
  });

  it('QT-03 case: the two lower-case forms of sigma are one letter, whatever follows', () => {
    // Lower-casing picks the final form "ς" by what follows the letter, and later steps remove
    // what follows. Found by the idempotence property: "ΑΣ(Α" gave "αςα", and that gave "ασα".
    expect(normalize('ΑΣ(Α')).toBe('ασα');
    expect(normalize(normalize('ΑΣ(Α'))).toBe(normalize('ΑΣ(Α'));
    expect(normalize('οδος')).toBe('οδοσ');
    expect(normalize('ΟΔΟΣ!')).toBe(normalize('οδοσ'));
  });

  it('QT-03 case: capitals typed for an iota subscript compare equal to it', () => {
    const subscript = String.fromCodePoint(0x1fb3); // alpha with an iota subscript
    const titlo = String.fromCodePoint(0x483); // a Cyrillic mark, which normalization keeps

    expect(normalize('ΑΙ')).toBe(normalize(subscript));
    expect(normalize(subscript.toUpperCase())).toBe(normalize(subscript));
    // The limit, stated: with a kept mark after the subscript, upper-casing the text as stored
    // moves the mark onto the new letter. From the canonical form it stays where it was.
    const marked = `${subscript}${titlo}`;
    expect(normalize(marked.normalize('NFD').toUpperCase())).toBe(normalize(marked));
    expect(normalize(marked.toUpperCase())).not.toBe(normalize(marked));
  });

  it('QT-03 diacritics', () => {
    expect(normalize('París')).toBe('paris');
    expect(normalize('Malmö')).toBe('malmo');
    expect(normalize('Łódź')).toBe('lodz');
    expect(normalize('Tromsø')).toBe('tromso');
    // The same letter, composed (NFC) and as a letter with a combining mark (NFD).
    expect(normalize('caf\u00e9')).toBe('cafe');
    expect(normalize('cafe\u0301')).toBe('cafe');
  });

  it('QT-03 diacritics: letters that do not decompose fold to their plain form', () => {
    expect(normalize('Ørsted')).toBe('orsted');
    expect(normalize('Łukasz')).toBe('lukasz');
    expect(normalize('Đorđe')).toBe('dorde');
    expect(normalize('Borðoy')).toBe('bordoy');
    expect(normalize('Þór')).toBe('thor');
    expect(normalize('Æsop')).toBe('aesop');
    expect(normalize('Œuvre')).toBe('oeuvre');
    expect(normalize('Ħal')).toBe('hal');
    expect(normalize('Ŧ')).toBe('t');
  });

  it('R9: every block of combining marks used with Latin, Greek and Cyrillic is removed, from its first code point to its last', () => {
    const blocks: [name: string, first: number, last: number][] = [
      ['Combining Diacritical Marks', 0x0300, 0x036f],
      ['Combining Diacritical Marks Extended', 0x1ab0, 0x1aff],
      ['Combining Diacritical Marks Supplement', 0x1dc0, 0x1dff],
      ['Combining Diacritical Marks for Symbols', 0x20d0, 0x20ff],
      ['Combining Half Marks', 0xfe20, 0xfe2f],
    ];

    for (const [name, first, last] of blocks) {
      for (const mark of [first, last]) {
        const marked = `e${String.fromCodePoint(mark)}z`;

        expect(normalize(marked), `${name}, U+${mark.toString(16)}`).toBe('ez');
      }
    }
    // Marks in use from the part of the first block after the iota subscript, U+0345: the tie
    // bar of "t\u0361s", and the small letters written above in medieval German.
    expect(normalize('t\u0361s')).toBe('ts');
    expect(normalize('u\u0364ber')).toBe('uber');
    // A vector arrow over a symbol, and a ligature tie made of two half marks.
    expect(normalize('v\u20d7')).toBe('v');
    expect(normalize('t\ufe20s\ufe21')).toBe('ts');
  });

  it('QT-03 diacritics: marks that carry meaning in other scripts are kept', () => {
    // Two Hindi words that differ by a vowel sign, and an Arabic word with and without harakat.
    expect(normalize('कि')).not.toBe(normalize('की'));
    expect(normalize('कि')).toBe('कि');
    expect(normalize('كَتَبَ')).not.toBe(normalize('كتب'));
  });

  it('QT-03 whitespace', () => {
    expect(normalize('  New \t York\n')).toBe('new york');
    expect(normalize('New\u00a0York')).toBe('new york');
    expect(normalize('\u3000New\u3000\u3000York\u3000')).toBe('new york');
    expect(normalize('par\u200bis')).toBe('paris');
    expect(normalize('par\u00adis')).toBe('paris');
    expect(normalize('\ufeffparis\u2060')).toBe('paris');
    expect(normalize('   ')).toBe('');
  });

  it('QT-03 punctuation', () => {
    expect(normalize("St. John's")).toBe('st johns');
    expect(normalize('St. John\u2019s')).toBe('st johns');
    expect(normalize('Jean-Paul')).toBe('jean paul');
    expect(normalize('Jean\u2013Paul')).toBe('jean paul');
    expect(normalize('AC/DC')).toBe('ac dc');
    expect(normalize('C++')).toBe('c++');
    expect(normalize('C#')).toBe('c#');
    expect(normalize('!!!')).toBe('');
    expect(normalize('U.S.A.')).toBe('usa');
    expect(normalize('3.14')).toBe('3.14');
    expect(normalize('3,14.')).toBe('3,14');
    expect(normalize('v1.2, final')).toBe('v1.2 final');
    expect(normalize('¿Qué?')).toBe('que');
    expect(normalize('"Heroes" (1977)')).toBe('heroes 1977');
  });

  it('QT-03 punctuation: symbols that change the answer are kept', () => {
    for (const symbol of ['+', '#', '&', '%', '$', '@', '*', '=']) {
      expect(normalize(`a${symbol}b`), symbol).toBe(`a${symbol}b`);
    }
    expect(normalize('C')).not.toBe(normalize('C++'));
  });

  it('QT-03 punctuation: a dot or comma stays only between two digits', () => {
    expect(normalize('314')).not.toBe(normalize('3.14'));
    expect(normalize('1,000')).toBe('1,000');
    expect(normalize('.5')).toBe('5');
    expect(normalize('No. 5')).toBe('no 5');
    expect(normalize('a.b')).toBe('ab');
    // An invisible character must not change what a number says.
    expect(normalize('3\u200b.14')).toBe('3.14');
  });

  it('QT-03 punctuation: a minus that begins a number is kept, whichever dash is typed for it', () => {
    expect(normalize('-40 degrees')).toBe('-40 degrees');
    expect(normalize('\u221240 degrees')).toBe('-40 degrees');
    expect(normalize('\u201340')).toBe('-40');
    expect(normalize('\u201440')).toBe('-40');
    expect(normalize('(-5)')).toBe('-5');
    expect(normalize('--5')).toBe('-5');
    expect(normalize('below -5')).toBe('below -5');
    expect(normalize(normalize('below --5'))).toBe('below -5');
  });

  it('QT-03 punctuation: a dash that begins no number separates words, as a hyphen does', () => {
    // After a letter or a digit, and before anything but a digit.
    expect(normalize('Apollo-11')).toBe('apollo 11');
    expect(normalize('Catch\u201322')).toBe('catch 22');
    expect(normalize('1939-1945')).toBe('1939 1945');
    expect(normalize('Jean\u2212Paul')).toBe('jean paul');
    expect(normalize('- 40')).toBe('40');
    expect(normalize('40-')).toBe('40');
    expect(normalize('-forty')).toBe('forty');
    expect(normalize('-')).toBe('');
    // What is left around the dash decides, so a second pass changes nothing.
    expect(normalize("b'-5")).toBe('b 5');
    expect(normalize('b.-5')).toBe('b 5');
  });

  it("QT-03 leading articles follow the question's locale", () => {
    expect(normalize('The Beatles')).toBe('beatles');
    expect(normalize('An Apple')).toBe('apple');
    expect(normalize('A')).toBe('a');
    expect(normalize('Theatre')).toBe('theatre');
    expect(normalize('The The')).toBe('the');
    expect(normalize('The Beatles', 'es')).toBe('the beatles');
    expect(normalize('La Paz', 'es-MX', es)).toBe('paz');
    expect(normalize('La Paz', 'en', es)).toBe('la paz');
  });

  it('every leading article is dropped, so an answer typed with fewer still matches', () => {
    // Dropping one article left "The A-Team" as "a team" and "A-Team" as "team": the same answer,
    // compared unequal. It also made normalization not idempotent ("The The The").
    expect(normalize('The A-Team')).toBe('team');
    expect(normalize('A-Team')).toBe('team');
    expect(normalize('The The The')).toBe('the');
    expect(normalize('A An The')).toBe('the');
    expect(normalize('Los Las El', 'es', es)).toBe('el');
  });

  it('reads only the primary subtag of the locale, in any case', () => {
    expect(normalize('The Beatles', 'en-GB')).toBe('beatles');
    expect(normalize('The Beatles', 'EN_us')).toBe('beatles');
    expect(normalize('The Beatles', 'eng')).toBe('the beatles');
    expect(normalize('The Beatles', '')).toBe('the beatles');
  });

  it('a locale named like an inherited property has no articles', () => {
    expect(normalize('The Beatles', 'constructor')).toBe('the beatles');
    expect(normalize('The Beatles', '__proto__')).toBe('the beatles');
    expect(normalize('The Beatles', 'toString-en')).toBe('the beatles');
  });

  it('an article is dropped only from the start, and only as a whole word', () => {
    expect(normalize('Beatles, The')).toBe('beatles the');
    expect(normalize('Anthem')).toBe('anthem');
    expect(normalize('A-ha')).toBe('ha');
    expect(normalize('The')).toBe('the');
    expect(normalize(' the ')).toBe('the');
  });

  it('full-width and compatibility forms', () => {
    expect(normalize('ＰＡＲＩＳ')).toBe('paris');
    expect(normalize('ﬁn')).toBe('fin');
    expect(normalize('３．１４')).toBe('3.14');
  });
});
