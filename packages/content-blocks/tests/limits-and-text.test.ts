import { describe, expect, it } from 'vitest';
import { expectValid, link, paragraph, reasons, text } from './support.ts';

// The spec sets no sizes and names no character rules, so these are the strict reading recorded
// in ADR 0003. The numbers are written out here on purpose: a changed limit must fail a test.

const listOf = (...items: unknown[]) => ({
  type: 'list',
  ordered: false,
  items: items.map((children) => ({ children })),
});

describe('validateBlocks: very long content', () => {
  it('ENG-01: accepts 32 blocks and rejects 33', () => {
    const blocks = (count: number) => Array.from({ length: count }, () => paragraph(text('x')));

    expectValid(blocks(32));
    expect(reasons(blocks(33))).toEqual([['too_long', []]]);
  });

  it('ENG-01: refuses 100,000 blocks with one reason, without reading them', () => {
    const blocks = Array.from({ length: 100_000 }, () => ({ type: 'not a block' }));

    expect(reasons(blocks)).toEqual([['too_long', []]]);
  });

  it('ENG-01: accepts a text span of 2,000 characters and rejects 2,001', () => {
    expectValid([paragraph(text('a'.repeat(2000)))]);
    expect(reasons([paragraph(text('a'.repeat(2001)))])).toEqual([
      ['too_long', [0, 'children', 0, 'text']],
    ]);
  });

  it('ENG-01: counts characters, not UTF-16 units, so 2,000 emoji fit in a span', () => {
    expectValid([paragraph(text('😀'.repeat(2000)))]);
    expect(reasons([paragraph(text('😀'.repeat(2001)))])).toEqual([
      ['too_long', [0, 'children', 0, 'text']],
    ]);
  });

  it('ENG-01: refuses a megabyte of text in one span with one reason', () => {
    expect(reasons([paragraph(text('a'.repeat(1_000_000)))])).toEqual([
      ['too_long', [0, 'children', 0, 'text']],
    ]);
  });

  it.each([
    ['LaTeX of 2,000 characters', { type: 'math', latex: 'x'.repeat(2000) }],
    ['source code of 4,000 characters', { type: 'code', language: 'c', source: 'x'.repeat(4000) }],
    ['alt text of 500 characters', { type: 'image', assetId: 'a1', alt: 'x'.repeat(500) }],
    [
      'a transcript of 2,000 characters',
      { type: 'audio', assetId: 'a2', transcript: 'x'.repeat(2000) },
    ],
    ['64 spans in a paragraph', paragraph(...Array.from({ length: 64 }, () => text('x')))],
    [
      '64 spans in a link',
      paragraph(link('https://example.com', ...Array.from({ length: 64 }, () => text('x')))),
    ],
    ['32 list items', listOf(...Array.from({ length: 32 }, () => [text('x')]))],
  ])('ENG-01: accepts %s', (_label, block) => {
    expectValid([block]);
  });

  it.each([
    ['LaTeX of 2,001 characters', { type: 'math', latex: 'x'.repeat(2001) }, [0, 'latex']],
    [
      'source code of 4,001 characters',
      { type: 'code', language: 'c', source: 'x'.repeat(4001) },
      [0, 'source'],
    ],
    [
      'alt text of 501 characters',
      { type: 'image', assetId: 'a1', alt: 'x'.repeat(501) },
      [0, 'alt'],
    ],
    [
      'a transcript of 2,001 characters',
      { type: 'audio', assetId: 'a2', transcript: 'x'.repeat(2001) },
      [0, 'transcript'],
    ],
    [
      '65 spans in a paragraph',
      paragraph(...Array.from({ length: 65 }, () => text('x'))),
      [0, 'children'],
    ],
    [
      '65 spans in a quote',
      { type: 'quote', children: Array.from({ length: 65 }, () => text('x')) },
      [0, 'children'],
    ],
    [
      '65 spans in a link',
      paragraph(link('https://example.com', ...Array.from({ length: 65 }, () => text('x')))),
      [0, 'children', 0, 'children'],
    ],
    ['33 list items', listOf(...Array.from({ length: 33 }, () => [text('x')])), [0, 'items']],
    [
      'six marks on one span',
      paragraph(text('x', ['bold', 'italic', 'code', 'subscript', 'bold', 'italic'])),
      [0, 'children', 0, 'marks'],
    ],
  ])('ENG-01: rejects %s', (_label, block, path) => {
    expect(reasons([block])).toEqual([['too_long', path]]);
  });

  it('ENG-01: accepts 10,000 characters across every kind of text, and rejects one more', () => {
    const content = (quote: string) => [
      { type: 'code', language: 'c', source: 'x'.repeat(4000) },
      { type: 'math', latex: 'x'.repeat(2000) },
      { type: 'audio', assetId: 'a2', transcript: 'x'.repeat(2000) },
      { type: 'image', assetId: 'a1', alt: 'x'.repeat(500) },
      listOf([text('x'.repeat(900))]),
      paragraph(link('https://example.com', text('x'.repeat(500)))),
      { type: 'quote', children: [text(quote)] },
    ];

    // 4,000 + 2,000 + 2,000 + 500 + 900 + 500 = 9,900, so the quote decides.
    expectValid(content('x'.repeat(100)));
    expect(reasons(content('x'.repeat(101)))).toEqual([['too_long', []]]);
  });

  it('ENG-01: counts the 10,000 in characters too, so 10,000 emoji fit', () => {
    const blocks = (count: number) =>
      Array.from({ length: count }, () => paragraph(text('😀'.repeat(2000))));

    expectValid(blocks(5));
    expect(reasons([...blocks(5), paragraph(text('😀'))])).toEqual([['too_long', []]]);
  });
});

describe('validateBlocks: deeply nested content', () => {
  const depth = 100_000;

  it('ENG-01: refuses blocks nested inside blocks, however deep, without overflowing', () => {
    let nested: unknown = paragraph(text('x'));
    for (let level = 0; level < depth; level += 1) nested = { type: 'quote', children: [nested] };

    expect(reasons([nested])).toEqual([['unknown_type', [0, 'children', 0, 'type']]]);
  });

  it('ENG-01: refuses lists nested inside lists, however deep, without overflowing', () => {
    let nested: unknown = 'x';
    for (let level = 0; level < depth; level += 1) nested = [nested];

    expect(reasons(nested)).toEqual([['invalid_type', [0]]]);
  });

  it('ENG-01: refuses a deep structure hidden under an extra key', () => {
    let nested: unknown = {};
    for (let level = 0; level < depth; level += 1) nested = { child: nested };

    expect(reasons([{ ...paragraph(text('x')), child: nested }])).toEqual([
      ['unknown_field', [0, 'child']],
    ]);
  });

  it('ENG-01: refuses a list inside a list item', () => {
    const inner = listOf([text('inner')]);

    expect(reasons([listOf([text('outer')], [inner])])).toEqual([
      ['unknown_type', [0, 'items', 1, 'children', 0, 'type']],
    ]);
  });
});

describe('validateBlocks: text in any script', () => {
  it.each([
    ['Arabic', 'ما هي عاصمة مصر؟'],
    ['Arabic with vowel marks', 'مَرْحَبًا بِكُمْ'],
    ['Hebrew', 'מהי בירת ישראל?'],
    ['Persian with a zero-width non-joiner', 'می\u200cخواهم'],
    ['Devanagari', 'भारत की राजधानी क्या है?'],
    ['Chinese', '中国的首都是哪里？'],
    ['Japanese', '日本の首都はどこですか？'],
    ['Korean', '대한민국의 수도는 어디입니까?'],
    ['Thai', 'เมืองหลวงของประเทศไทยคืออะไร'],
    ['emoji sequences', '👩‍🚀 🏳️‍🌈 🇳🇵'],
    ['mathematical and historic symbols', '𝑥 ∈ ℝ, 𓂀'],
    ['right-to-left text isolated inside left-to-right', 'The word \u2067שלום\u2069 means peace.'],
    ['direction marks', 'C++\u200e هي لغة\u200f.'],
    ['a decomposed accent, left decomposed', 'Cafe\u0301'],
  ])('ENG-01: accepts %s and returns it unchanged', (_label, sample) => {
    expectValid([
      paragraph(text(sample), link('https://example.com', text(sample, ['bold']))),
      { type: 'quote', children: [text(sample)] },
      listOf([text(sample)]),
      { type: 'image', assetId: 'a1', alt: sample },
      { type: 'audio', assetId: 'a2', transcript: sample },
      { type: 'code', language: 'python', source: `print("${sample}")` },
    ]);
  });

  it.each([
    ['a null character', '\u0000'],
    ['a bell', '\u0007'],
    ['an escape', '\u001b'],
    ['a delete', '\u007f'],
    ['a C1 control', '\u0085'],
    ['a tab', '\t'],
    ['a line feed', '\n'],
    ['a carriage return', '\r'],
    ['a line separator', '\u2028'],
    ['a paragraph separator', '\u2029'],
    ['a lone high surrogate', '\ud83d'],
    ['a lone low surrogate', '\ude00'],
  ])('ENG-01: rejects %s in a line of text', (_label, character) => {
    const sample = `before${character}after`;

    expect(
      reasons([
        paragraph(text(sample), link('https://example.com', text(sample))),
        { type: 'image', assetId: 'a1', alt: sample },
      ]),
    ).toEqual([
      ['unsupported_character', [0, 'children', 0, 'text']],
      ['unsupported_character', [0, 'children', 1, 'children', 0, 'text']],
      ['unsupported_character', [1, 'alt']],
    ]);
  });

  it('ENG-01: keeps line feeds and tabs in code, LaTeX and transcripts', () => {
    expectValid([
      { type: 'code', language: 'python', source: 'def f():\n\treturn 1\n' },
      { type: 'math', latex: '\\begin{aligned}\n\ta &= b \\\\\n\tc &= d\n\\end{aligned}' },
      { type: 'audio', assetId: 'a2', transcript: 'First speaker.\nSecond speaker.' },
    ]);
  });

  it.each([
    ['a null character', '\u0000'],
    ['an escape', '\u001b'],
    ['a carriage return', '\r'],
    ['a lone surrogate', '\ud800'],
  ])('ENG-01: rejects %s in code, LaTeX and transcripts', (_label, character) => {
    const sample = `before${character}after`;

    expect(
      reasons([
        { type: 'code', language: 'python', source: sample },
        { type: 'math', latex: sample },
        { type: 'audio', assetId: 'a2', transcript: sample },
      ]),
    ).toEqual([
      ['unsupported_character', [0, 'source']],
      ['unsupported_character', [1, 'latex']],
      ['unsupported_character', [2, 'transcript']],
    ]);
  });
});
