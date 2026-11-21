import type { Block } from '@repo/content-blocks';
import { describe, expect, it } from 'vitest';
import {
  assetOf,
  audioAssetSchema,
  codeRenderingOf,
  codeRenderingSchema,
  codeTokenKinds,
  imageAssetSchema,
  mathRenderingOf,
  mathRenderingSchema,
  maxSvgLength,
  renderingsSchema,
  svgProblem,
  unrenderedBlocks,
} from '../src/published.ts';
import type { Renderings } from '../src/published.ts';
import { accepts, withValue, without } from './support.ts';

// The published forms of content (spec §11.3, ADR 0022): rendered math, tokenized code and media
// files, carried beside the blocks they belong to and matched to them by value.

/** What MathJax's SVG output looks like: paths in `defs`, drawn with `use` in `currentColor`. */
const mathJaxSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1.294ex" height="1.025ex" role="img" focusable="false" viewBox="0 -442 572 453" style="vertical-align: -0.025ex;"><defs><path id="MJX-1-I-78" d="M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"><g data-mml-node="math"><use data-c="78" xlink:href="#MJX-1-I-78"></use></g></g></svg>';

/** The same drawing with something spliced in before its closing tag. */
const svgWith = (inside: string): string => mathJaxSvg.replace('</svg>', `${inside}</svg>`);

const formula = { latex: 'x', svg: mathJaxSvg, widthEx: 1.294, heightEx: 1.025 };

const listing = {
  language: 'python',
  source: 'x = 1\n\nprint(x)',
  lines: [
    [
      { text: 'x', kind: 'variable' },
      { text: ' = ', kind: 'operator' },
      { text: '1', kind: 'number' },
    ],
    [],
    [
      { text: 'print', kind: 'function' },
      { text: '(x)', kind: 'punctuation' },
    ],
  ],
};

const picture = {
  assetId: 'planet-mars',
  kind: 'image',
  width: 1200,
  height: 900,
  placeholder: { kind: 'thumbhash', hash: '1QcSHQRnh493V4dIh4eXh1h4kJUI' },
  sources: [
    {
      url: 'https://media.example.org/planet-mars/480.avif',
      format: 'avif',
      width: 480,
      bytes: 18_000,
    },
  ],
} as const;

const clip = {
  assetId: 'whale-song',
  kind: 'audio',
  durationMs: 12_400,
  sources: [{ url: 'https://media.example.org/whale-song.m4a', format: 'm4a', bytes: 96_000 }],
} as const;

describe('rendered math', () => {
  it('a MathJax-shaped SVG parses', () => {
    expect(svgProblem(mathJaxSvg)).toBeNull();
    expect(mathRenderingSchema.parse(formula)).toEqual(formula);
  });

  it.each([
    ['a script element', svgWith('<script>alert(1)</script>')],
    ['a script element in capitals', svgWith('<SCRIPT>alert(1)</SCRIPT>')],
    ['a script element with a space after the bracket', svgWith('< script>alert(1)</script>')],
    ['foreignObject, which holds HTML', svgWith('<foreignObject><p>hi</p></foreignObject>')],
    ['an iframe', svgWith('<iframe></iframe>')],
    ['an embedded image', svgWith('<image width="1" height="1"></image>')],
    ['a style element', svgWith('<style>path{fill:red}</style>')],
    ['a link', svgWith('<a><path d="M0 0"></path></a>')],
    ['an animation', svgWith('<animate attributeName="d"></animate>')],
    ['a set element', svgWith('<set attributeName="d"></set>')],
    ['an event handler', svgWith('<path onload="alert(1)" d="M0 0"></path>')],
    ['an event handler in capitals', svgWith('<path ONCLICK = "alert(1)" d="M0 0"></path>')],
    ['a reference to another site', svgWith('<use href="https://evil.example/x.svg#a"></use>')],
    ['a reference to a script', svgWith('<use xlink:href="javascript:alert(1)"></use>')],
    ['a reference to inline data', svgWith("<use href='data:image/svg+xml;base64,AA'></use>")],
    ['an unquoted outside reference', svgWith('<use href=//evil.example/x.svg></use>')],
    ['a src attribute', svgWith('<path src="https://evil.example/a" d="M0 0"></path>')],
    ['a url() to another site', svgWith('<path style="fill:url(https://evil.example/a)"></path>')],
    ['a doctype', `<!DOCTYPE svg>${mathJaxSvg}`],
    ['an entity declaration', svgWith('<!ENTITY x "y">')],
    ['a comment', svgWith('<!-- hidden -->')],
    ['a processing instruction', svgWith('<?xml-stylesheet href="a.css"?>')],
    ['text before the element', `hello ${mathJaxSvg}`],
    ['text after the element', `${mathJaxSvg}<p>hello</p>`],
    ['HTML that is no SVG', '<div><svg></svg></div>'],
    ['an element that only starts like svg', '<svgx></svgx></svg>'],
    ['an empty string', ''],
  ])('hostile markup is refused: %s', (_name, svg) => {
    expect(svgProblem(svg)).not.toBeNull();
    expect(accepts(mathRenderingSchema, { ...formula, svg })).toBe(false);
  });

  it('a reference inside the drawing and a url() to a fragment pass', () => {
    expect(svgProblem(svgWith('<use href="#MJX-1-I-78"></use>'))).toBeNull();
    expect(svgProblem(svgWith('<path fill="url(#gradient)" d="M0 0"></path>'))).toBeNull();
    expect(
      svgProblem(svgWith('<path style="fill:url(\'#gradient\')" d="M0 0"></path>')),
    ).toBeNull();
  });

  it('a drawing longer than the cap is refused', () => {
    const padding = `<path d="${'M0 0'.repeat(maxSvgLength / 4)}"></path>`;

    expect(svgProblem(svgWith(padding))).toBe('It is too long.');
  });

  it('a size is a positive number of ex', () => {
    expect(accepts(mathRenderingSchema, { ...formula, widthEx: 0 })).toBe(false);
    expect(accepts(mathRenderingSchema, { ...formula, heightEx: Number.NaN })).toBe(false);
    expect(accepts(mathRenderingSchema, without(formula, 'widthEx'))).toBe(false);
  });
});

describe('tokenized code', () => {
  it('lines of tokens parse, an empty line included', () => {
    expect(codeRenderingSchema.parse(listing)).toEqual(listing);
  });

  it('tokens must spell the source', () => {
    const oneTokenShort = withValue(listing, 'lines', listing.lines.slice(0, 2));
    const otherSource = withValue(listing, 'source', 'x = 2\n\nprint(x)');

    expect(accepts(codeRenderingSchema, oneTokenShort)).toBe(false);
    expect(accepts(codeRenderingSchema, otherSource)).toBe(false);
  });

  it('a token stays on its line', () => {
    const spanning = {
      language: 'python',
      source: 'a\nb',
      lines: [[{ text: 'a\nb', kind: 'plain' }]],
    };

    expect(accepts(codeRenderingSchema, spanning)).toBe(false);
  });

  it('an unknown token kind parses: the app draws it as plain', () => {
    const withNewKind = withValue(listing, 'lines', [
      [{ text: 'x = 1', kind: 'decorator' }],
      [],
      [{ text: 'print(x)', kind: 'plain' }],
    ]);

    expect(codeTokenKinds).not.toContain('decorator');
    expect(accepts(codeRenderingSchema, withNewKind)).toBe(true);
  });

  it('a kind is a lowercase word, not a colour or a class list', () => {
    const coloured = withValue(listing, 'lines', [
      [{ text: 'x = 1', kind: '#ff0000' }],
      [],
      [{ text: 'print(x)', kind: 'plain' }],
    ]);

    expect(accepts(codeRenderingSchema, coloured)).toBe(false);
  });
});

describe('media assets', () => {
  it('an image and an audio clip parse', () => {
    expect(imageAssetSchema.parse(picture)).toEqual(picture);
    expect(audioAssetSchema.parse(clip)).toEqual(clip);
    expect(accepts(imageAssetSchema, { ...picture, placeholder: null })).toBe(true);
  });

  it('a file address is https, and an image has at least one file', () => {
    const overHttp = [{ ...picture.sources[0], url: 'http://media.example.org/a.avif' }];

    expect(accepts(imageAssetSchema, { ...picture, sources: overHttp })).toBe(false);
    expect(accepts(imageAssetSchema, { ...picture, sources: [] })).toBe(false);
  });

  it('an audio clip runs to 30 seconds at most', () => {
    expect(accepts(audioAssetSchema, { ...clip, durationMs: 30_000 })).toBe(true);
    expect(accepts(audioAssetSchema, { ...clip, durationMs: 30_001 })).toBe(false);
  });

  it('alt text is the block’s, so an asset that carries one loses it on parsing', () => {
    expect(imageAssetSchema.parse({ ...picture, alt: 'Mars' })).toEqual(picture);
  });
});

describe('renderings', () => {
  const renderings: Renderings = renderingsSchema.parse({
    media: [picture, clip],
    math: [formula],
    code: [listing],
  });

  it('three lists, each of which may be empty', () => {
    expect(accepts(renderingsSchema, { media: [], math: [], code: [] })).toBe(true);
    expect(accepts(renderingsSchema, { media: [], math: [] })).toBe(false);
  });

  it('a rendering listed twice is refused', () => {
    expect(accepts(renderingsSchema, { media: [picture, picture], math: [], code: [] })).toBe(
      false,
    );
    expect(accepts(renderingsSchema, { media: [], math: [formula, formula], code: [] })).toBe(
      false,
    );
    expect(accepts(renderingsSchema, { media: [], math: [], code: [listing, listing] })).toBe(
      false,
    );
  });

  it('a block finds its rendering by value', () => {
    expect(assetOf('planet-mars', renderings)).toEqual(picture);
    expect(assetOf('planet-venus', renderings)).toBeUndefined();
    expect(mathRenderingOf({ type: 'math', latex: 'x' }, renderings)).toEqual(formula);
    expect(mathRenderingOf({ type: 'math', latex: 'x ' }, renderings)).toBeUndefined();
    expect(
      codeRenderingOf({ type: 'code', language: 'python', source: listing.source }, renderings),
    ).toEqual(listing);
    expect(
      codeRenderingOf({ type: 'code', language: 'ruby', source: listing.source }, renderings),
    ).toBeUndefined();
  });

  it('unrenderedBlocks names the blocks with no rendering, and a block matched to the wrong kind of asset', () => {
    const paragraph: Block = { type: 'paragraph', children: [{ type: 'text', text: 'Plain.' }] };
    const rendered: Block[] = [
      paragraph,
      { type: 'math', latex: 'x' },
      { type: 'code', language: 'python', source: listing.source },
      { type: 'image', assetId: 'planet-mars', alt: 'Mars' },
      { type: 'audio', assetId: 'whale-song', transcript: 'A long, low call.' },
    ];
    const missing: Block[] = [
      { type: 'math', latex: 'y' },
      { type: 'code', language: 'python', source: 'print(2)' },
      { type: 'image', assetId: 'planet-venus', alt: 'Venus' },
      { type: 'audio', assetId: 'bird-song', transcript: 'Three short notes.' },
      // An asset of the other kind is no rendering of this block.
      { type: 'image', assetId: 'whale-song', alt: 'A whale' },
      { type: 'audio', assetId: 'planet-mars', transcript: 'Silence.' },
    ];

    expect(unrenderedBlocks(rendered, renderings)).toEqual([]);
    expect(unrenderedBlocks([...rendered, ...missing], renderings)).toEqual(missing);
    expect(unrenderedBlocks([paragraph], { media: [], math: [], code: [] })).toEqual([]);
  });
});
