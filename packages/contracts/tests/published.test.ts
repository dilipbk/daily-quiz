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
  renderingsSchema,
  unrenderedBlocks,
} from '../src/published.ts';
import type { Renderings } from '../src/published.ts';
import { maxSvgLength, svgProblem } from '../src/svg.ts';
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

  // Each of these slips past a list of forbidden patterns; a list of what is allowed stops them.
  it.each([
    ['a slash where a space would be', svgWith('<path/onload="alert(1)" d="M0 0"></path>')],
    ['a namespaced element', svgWith('<svg:script>alert(1)</svg:script>')],
    ['an element in the wrong case', svgWith('<Path d="M0 0"></Path>')],
    ['an element outside the list', svgWith('<clipPath id="MJX-c"></clipPath>')],
    ['an attribute outside the list', svgWith('<path tabindex="0" d="M0 0"></path>')],
    ['a class, which a page could style', svgWith('<g class="hidden"></g>')],
    ['a numeric reference in an attribute', svgWith('<use href="&#x23;MJX-1-I-78"></use>')],
    ['a numeric reference in a path', svgWith('<path d="&#77;0 0"></path>')],
    ['an unknown named reference', svgWith('<path d="M0 0" data-x="&nbsp;"></path>')],
    ['a broken reference in text', svgWith('<text>a & b</text>')],
    ['an attribute given twice', svgWith('<use href="#MJX-1-I-78" href="#MJX-b"></use>')],
    ['a style with brackets', svgWith('<path style="width:calc(1px)" d="M0 0"></path>')],
    ['a style with an escape', svgWith('<path style="vertical-align:\\75rl" d="M0 0"></path>')],
    [
      'another namespace',
      mathJaxSvg.replace('http://www.w3.org/2000/svg', 'http://evil.example/ns'),
    ],
    ['elements that cross', svgWith('<g><text>x</g></text>')],
    ['an element left open', svgWith('<g>')],
    ['a closing tag with an attribute', svgWith('<g></g fill="none">')],
    ['a bracket inside a tag', svgWith('<path d="M0 0" <g>></path>')],
    ['a second root', `${mathJaxSvg}${mathJaxSvg}`],
    ['a root that is not svg', '<g></g>'],
    // A browser reads <title> and <desc> as HTML, where a second <title> swallows what follows
    // as text and ends at the first </title>, wherever this grammar thought that was.
    [
      'markup hidden in a value inside a title',
      svgWith(
        '<title><title><g data-x="</title><img src=x onerror=alert(1)>"></g></title></title>',
      ),
    ],
    ['an element inside a title', svgWith('<title><g></g></title>')],
    ['a title inside a description', svgWith('<desc><title>x</title></desc>')],
    ['a bracket in a value', svgWith('<g data-latex="a > b"></g>')],
    ['a closing tag in a value', svgWith('<g data-latex="</g>"></g>')],
    ['a bracket in text', svgWith('<text>a > b</text>')],
    // A browser separates attributes with ASCII white space only. To it, a no-break space after
    // the "=" begins an unquoted value, which ends at the next space and frees what follows.
    [
      'a no-break space that turns a quoted value into attributes',
      svgWith("<g data-x=\u00A0' onload=alert(1) '></g>"),
    ],
    ['a no-break space before the equals sign', svgWith('<g fill\u00A0="none"></g>')],
    ['a no-break space between attributes', svgWith('<g fill="none"\u00A0stroke="none"></g>')],
    ['a no-break space after the element name', svgWith('<g\u00A0fill="none"></g>')],
    ['a line separator between attributes', svgWith('<g fill="none"\u2028stroke="none"></g>')],
    ['a byte-order mark before an attribute', svgWith('<g \uFEFFfill="none"></g>')],
    ['a form feed between attributes', svgWith('<g fill="none"\fstroke="none"></g>')],
    ['a no-break space in a closing tag', svgWith('<g></g\u00A0>')],
    ['a no-break space before a closing slash', svgWith('<path d="M0 0"\u00A0/>')],
    ['a slash that does not end the tag', svgWith('<path d="M0 0" / ></path>')],
  ])('what the grammar does not describe is refused: %s', (_name, svg) => {
    expect(svgProblem(svg)).not.toBeNull();
    expect(accepts(mathRenderingSchema, { ...formula, svg })).toBe(false);
  });

  // CSS reads "\75rl(" as "url(", so a value is never left for CSS to interpret: no backslash,
  // no bracket, and a grammar of its own for a colour, a transform and a style.
  it.each([
    [
      'a url() spelled with a CSS escape',
      svgWith('<path fill="\\75rl(https://evil.example/p.svg#g)" d="M0 0"></path>'),
    ],
    ['a url() with one letter escaped', svgWith('<path stroke="u\\72l(#g)" d="M0 0"></path>')],
    ['a url() to a fragment', svgWith('<path fill="url(#MJX-1-I-78)" d="M0 0"></path>')],
    ['a CSS variable as a colour', svgWith('<path fill="var(--x)" d="M0 0"></path>')],
    ['a src() as a colour', svgWith('<path stroke="src(x)" d="M0 0"></path>')],
    ['a backslash in a path', svgWith('<path d="M0 0\\"></path>')],
    ['a bracket in a length', svgWith('<rect width="calc(1px)" height="1"></rect>')],
    ['a transform with something else in it', svgWith('<g transform="scale(1,-1) url(x)"></g>')],
    ['a transform that nests a function', svgWith('<g transform="rotate(calc(1))"></g>')],
    ['a style that covers the page', svgWith('<g style="position:fixed;top:0;left:0"></g>')],
    ['a style that is no declaration', svgWith('<g style="vertical-align"></g>')],
    ['a style value with a bracket', svgWith('<g style="font-family: a(b)"></g>')],
  ])('nothing is left for CSS to interpret: %s', (_name, svg) => {
    expect(svgProblem(svg)).not.toBeNull();
  });

  // A drawing stands on its own: it can't reach into the page it is placed in, take the name of
  // something that page relies on, or multiply itself.
  it.each([
    ['a use that points at nothing', svgWith('<use href="#MJX-missing"></use>')],
    [
      'a use that points at a group, which could hold more uses',
      svgWith('<g id="MJX-group"><path d="M0 0"></path></g><use href="#MJX-group"></use>'),
    ],
    [
      'a reference on something that is not a use',
      svgWith('<path href="#MJX-1-I-78" d="M0 0"></path>'),
    ],
    ['a reference to an empty fragment', svgWith('<use href="#"></use>')],
    [
      'a reference without the MathJax prefix',
      svgWith('<path id="glyph" d="M0 0"></path><use href="#glyph"></use>'),
    ],
    ['an id a page might rely on', svgWith('<g id="config"></g>')],
    ['an id used twice', svgWith('<path id="MJX-1-I-78" d="M0 0"></path>')],
    ['elements nested 200 deep', svgWith('<g>'.repeat(200) + '</g>'.repeat(200))],
    ['a root with no namespace', '<svg></svg>'],
    [
      'xlink:href with no xlink namespace declared',
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="MJX-a" d="M0 0"></path></defs><use xlink:href="#MJX-a"></use></svg>',
    ],
    ['a null character', svgWith('<text>a\u0000b</text>')],
    ['half of a surrogate pair', svgWith('<text>\uD800</text>')],
    ['a reference to the null character', svgWith('<text>&#0;</text>')],
    ['a reference to a surrogate', svgWith('<text>&#xD800;</text>')],
    ['a reference past the last character', svgWith('<text>&#9999999;</text>')],
  ])('a drawing stands on its own and is well formed: %s', (_name, svg) => {
    expect(svgProblem(svg)).not.toBeNull();
  });

  it.each([
    ['a reference to a shape in the drawing', svgWith('<use href="#MJX-1-I-78"></use>')],
    ['a self-closing element', svgWith('<path d="M0 0"/>')],
    ['single-quoted values', svgWith("<rect x='0' y='0' width='10' height='10'></rect>")],
    [
      'a nested svg, as MathJax draws stretched brackets',
      svgWith(
        '<svg x="0" y="0" width="10" height="10" viewBox="0 0 10 10"><path d="M0 0"></path></svg>',
      ),
    ],
    [
      'a title and text with references',
      svgWith('<title>x &lt; y &amp; y &gt; 0</title><text x="0" y="0">&#x3b1; &#946;</text>'),
    ],
    ['a named reference in a data attribute', svgWith('<g data-latex="a &amp; b"></g>')],
    ['LaTeX source in a data attribute', svgWith('<g data-latex="\\frac{1}{2} (x)"></g>')],
    [
      'MathJax 4 accessibility attributes',
      svgWith('<g aria-level="1" aria-roledescription="math"></g>'),
    ],
    [
      'line breaks between attributes',
      svgWith('<path\n  d="M0 0"\n  fill="currentColor"\n></path>'),
    ],
    [
      'tabs and carriage returns between attributes',
      svgWith('<path\td="M0 0"\r\n\tfill="none"></path>'),
    ],
    ['spaces around an equals sign', svgWith('<g fill = "none"></g>')],
    ['a letter outside ASCII inside a quoted value', svgWith('<g aria-label="α\u00A0β"></g>')],
    [
      'hex and rgb colours',
      svgWith('<path fill="#1a2b3c" stroke="rgb(255, 0, 0)" d="M0 0"></path>'),
    ],
    ['a list of transforms', svgWith('<g transform="translate(10, -20) scale(0.5)"></g>')],
    [
      'a style of text properties',
      svgWith('<text style="font-family: serif; font-size: 12px;">x</text>'),
    ],
    ['128 levels of nesting', svgWith('<g>'.repeat(127) + '</g>'.repeat(127))],
    ['an empty drawing', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ['a drawing closed in its own tag', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
  ])('what the grammar describes passes: %s', (_name, svg) => {
    expect(svgProblem(svg)).toBeNull();
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

  it('a language is one word, and a pair of language and source matches no other pair', () => {
    const renderings: Renderings = {
      media: [],
      math: [],
      code: [
        {
          language: 'js',
          source: 'x\ny',
          lines: [[{ text: 'x', kind: 'plain' }], [{ text: 'y', kind: 'plain' }]],
        },
      ],
    };

    expect(accepts(codeRenderingSchema, withValue(listing, 'language', 'py thon'))).toBe(false);
    expect(accepts(codeRenderingSchema, withValue(listing, 'language', 'js\nx'))).toBe(false);
    expect(accepts(codeRenderingSchema, withValue(listing, 'language', ''))).toBe(false);
    expect(
      codeRenderingOf({ type: 'code', language: 'js', source: 'x\ny' }, renderings),
    ).toBeDefined();
    expect(
      codeRenderingOf({ type: 'code', language: 'js\nx', source: 'y' }, renderings),
    ).toBeUndefined();
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
