import { describe, expect, it } from 'vitest';
import { expectValid, issuesFor, link, paragraph, reasons, text } from './support.ts';

// Vitest types its asymmetric matchers as `any`; these give them the type of the field they match.
const anyReason = expect.any(String) as string;
const mentioning = (words: string) => expect.stringContaining(words) as string;

const everyBlockType = [
  paragraph(
    text('Water is '),
    text('H', ['bold']),
    text('2', ['bold', 'subscript']),
    text('O', ['bold']),
    text('. See '),
    link('https://en.wikipedia.org/wiki/Water', text('Wikipedia', ['italic'])),
    text('.'),
  ),
  { type: 'math', latex: '\\ce{2H2 + O2 -> 2H2O}' },
  { type: 'code', language: 'python', source: 'def area(r):\n\treturn 3.14159 * r ** 2\n' },
  {
    type: 'image',
    assetId: 'asset_01JCX3V7Q2',
    alt: 'A water molecule: one oxygen atom bonded to two hydrogen atoms.',
  },
  {
    type: 'audio',
    assetId: '0192f3a1-7c1e-7b4e-9d2a-3f6b8c1d2e4f',
    transcript: 'Bonjour. Comment allez-vous ?',
  },
  { type: 'quote', children: [text('Eppur si muove.')] },
  {
    type: 'list',
    ordered: true,
    items: [{ children: [text('Mercury')] }, { children: [text('Venus')] }],
  },
];

describe('validateBlocks: the blocks of spec §11.3', () => {
  it('§11.3: accepts content that uses every block type and returns it unchanged', () => {
    expectValid(everyBlockType);
  });

  it.each(['bold', 'italic', 'code', 'subscript', 'superscript'])(
    '§11.3: accepts the inline mark %s',
    (mark) => {
      expectValid([paragraph(text('x', [mark]))]);
    },
  );

  it('§11.3: accepts several marks on one span, and a span with none', () => {
    expectValid([paragraph(text('x', ['bold', 'italic', 'code']), text('y', []))]);
  });

  it("§11.3: rejects a mark the spec doesn't list", () => {
    expect(reasons([paragraph(text('x', ['bold', 'underline']))])).toEqual([
      ['invalid_value', [0, 'children', 0, 'marks', 1]],
    ]);
  });

  it.each([
    ['a mark listed twice', ['bold', 'bold']],
    ['subscript together with superscript', ['subscript', 'superscript']],
  ])('§11.3: rejects %s', (_label, marks) => {
    expect(reasons([paragraph(text('x', marks))])).toEqual([
      ['invalid_value', [0, 'children', 0, 'marks']],
    ]);
  });

  it.each([
    ['a list without "ordered"', { type: 'list', items: [{ children: [text('x')] }] }, 'ordered'],
    ['a code block without a language', { type: 'code', source: 'x = 1' }, 'language'],
    ['a math block without LaTeX', { type: 'math' }, 'latex'],
    ['a paragraph without children', { type: 'paragraph' }, 'children'],
    ['an image without an asset', { type: 'image', alt: 'A cat.' }, 'assetId'],
  ])('§11.3: rejects %s', (_label, block, field) => {
    expect(reasons([block])).toEqual([['missing_field', [0, field]]]);
  });

  it.each([
    [{ type: 'list', ordered: 'yes', items: [{ children: [text('x')] }] }, [0, 'ordered']],
    [{ type: 'list', ordered: 1, items: [{ children: [text('x')] }] }, [0, 'ordered']],
    [{ type: 'math', latex: ['x^2'] }, [0, 'latex']],
    [{ type: 'code', language: 'python', source: null }, [0, 'source']],
    [paragraph({ type: 'text', text: 42 }), [0, 'children', 0, 'text']],
    [paragraph({ type: 'text', text: 'x', marks: 'bold' }), [0, 'children', 0, 'marks']],
  ])('§11.3: rejects a field of the wrong type: %j', (block, path) => {
    expect(reasons([block])).toEqual([['invalid_type', path]]);
  });

  it.each(['Python 3', 'PYTHON', '', '<script>', 'a'.repeat(33)])(
    '§11.3: rejects the code language %j',
    (language) => {
      expect(reasons([{ type: 'code', language, source: 'x = 1' }])).toEqual([
        ['invalid_value', [0, 'language']],
      ]);
    },
  );

  it.each(['python', 'c', 'c++', 'c#', 'objective-c', 'plaintext', '1c'])(
    '§11.3: accepts the code language %j',
    (language) => {
      expectValid([{ type: 'code', language, source: 'x = 1' }]);
    },
  );
});

describe('validateBlocks: structured blocks only', () => {
  it.each([
    ['a raw HTML string', '<p>Hello <b>world</b></p>'],
    ['a Markdown string', '# Hello\n\nSome **bold** text and a [link](https://example.com).'],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a single block outside a list', paragraph(text('Hello'))],
    ['an object wrapping a list', { blocks: [paragraph(text('Hello'))] }],
    ['an object carrying HTML', { html: '<p>Hello</p>' }],
  ])('SEC-08: rejects %s offered in place of blocks', (_label, content) => {
    expect(reasons(content)).toEqual([['not_a_block_list', []]]);
  });

  it.each([['<p>Hello</p>'], ['# Hello'], [null], [42], [true], [[paragraph(text('Hello'))]]])(
    'SEC-08: rejects %j where a block is expected',
    (notABlock) => {
      expect(reasons([notABlock])).toEqual([['invalid_type', [0]]]);
    },
  );

  it.each([
    [{ type: 'paragraph', children: '<b>Hello</b>' }, [0, 'children']],
    [{ type: 'paragraph', children: ['<b>Hello</b>'] }, [0, 'children', 0]],
    [{ type: 'quote', children: '> Hello' }, [0, 'children']],
    [{ type: 'list', ordered: false, items: '<li>One</li>' }, [0, 'items']],
    [{ type: 'list', ordered: false, items: ['One'] }, [0, 'items', 0]],
    [{ type: 'list', ordered: false, items: [{ children: 'One' }] }, [0, 'items', 0, 'children']],
    [paragraph(link('https://example.com', 'Example')), [0, 'children', 0, 'children', 0]],
  ])('SEC-08: rejects a string where inline content is expected: %j', (block, path) => {
    expect(reasons([block])).toEqual([['invalid_type', path]]);
  });

  it.each([
    'html',
    'markdown',
    'raw',
    'iframe',
    'embed',
    'video',
    'table',
    'heading',
    'text',
    'link',
    'Paragraph',
    'PARAGRAPH',
    ' paragraph',
    '',
    5,
    null,
    ['paragraph'],
  ])('SEC-08: rejects the block type %j', (type) => {
    expect(reasons([{ type, html: '<p>Hello</p>', children: [text('Hello')] }])).toEqual([
      ['unknown_type', [0, 'type']],
    ]);
  });

  it.each([[{}], [{ children: [text('Hello')] }], [{ html: '<p>Hello</p>' }]])(
    'SEC-08: rejects the block %j, which has no type',
    (block) => {
      expect(reasons([block])).toEqual([['missing_field', [0, 'type']]]);
    },
  );

  it.each([
    [{ type: 'html', html: '<b>Hello</b>' }],
    [{ type: 'image', assetId: 'asset_1', alt: 'A cat.' }],
    [{ type: 'math', latex: 'x^2' }],
    [paragraph(text('nested'))],
  ])('SEC-08: rejects %j inside a paragraph: inline content is text and links', (inline) => {
    expect(reasons([paragraph(inline)])).toEqual([['unknown_type', [0, 'children', 0, 'type']]]);
  });

  it('SEC-08: rejects unexpected extra keys on a block, one reason per key', () => {
    const block = { ...paragraph(text('Hello')), html: '<b>Hello</b>', style: { color: 'red' } };

    expect(reasons([block])).toEqual([
      ['unknown_field', [0, 'html']],
      ['unknown_field', [0, 'style']],
    ]);
  });

  it.each([
    [
      'a text span carrying a link target',
      paragraph({ ...text('Click'), href: 'https://example.com' }),
      [0, 'children', 0, 'href'],
    ],
    [
      'a link with a target',
      paragraph({ ...link('https://example.com', text('Example')), target: '_blank' }),
      [0, 'children', 0, 'target'],
    ],
    [
      'link text with a handler',
      paragraph(link('https://example.com', { ...text('Example'), onPress: 'alert(1)' })),
      [0, 'children', 0, 'children', 0, 'onPress'],
    ],
    [
      'a list item with a list of its own',
      { type: 'list', ordered: false, items: [{ children: [text('One')], items: [] }] },
      [0, 'items', 0, 'items'],
    ],
    [
      'a math block carrying its own SVG',
      { type: 'math', latex: 'x^2', svg: '<svg onload="alert(1)"/>' },
      [0, 'svg'],
    ],
    [
      'a code block carrying HTML',
      { type: 'code', language: 'python', source: 'x = 1', html: '<pre>x = 1</pre>' },
      [0, 'html'],
    ],
    [
      'an image with a URL beside its asset',
      { type: 'image', assetId: 'asset_1', alt: 'A cat.', url: 'http://example.com/cat.png' },
      [0, 'url'],
    ],
    [
      'an audio block with a player setting',
      { type: 'audio', assetId: 'asset_2', transcript: 'Hello.', autoplay: true },
      [0, 'autoplay'],
    ],
    [
      'a "__proto__" key parsed from JSON',
      JSON.parse('{"type":"math","latex":"x^2","__proto__":{"type":"html"}}') as unknown,
      [0, '__proto__'],
    ],
  ])('SEC-08: rejects %s', (_label, block, path) => {
    expect(reasons([block])).toEqual([['unknown_field', path]]);
  });

  it('SEC-08: keeps text that looks like markup as plain text', () => {
    expectValid([
      paragraph(text('<script>alert(1)</script> & <b>bold</b> **bold** [x](javascript:alert(1))')),
      { type: 'code', language: 'html', source: '<a href="http://example.com">x</a>' },
    ]);
  });

  it.each([
    ['https://evil.example/cat.png'],
    ['//evil.example/cat.png'],
    ['../../etc/passwd'],
    ['cat.png'],
    ['asset 1'],
    [''],
    ['a'.repeat(65)],
  ])('SEC-08: rejects %j as an asset reference: media comes from the asset store', (assetId) => {
    expect(reasons([{ type: 'image', assetId, alt: 'A cat.' }])).toEqual([
      ['invalid_value', [0, 'assetId']],
    ]);
    expect(reasons([{ type: 'audio', assetId, transcript: 'Hello.' }])).toEqual([
      ['invalid_value', [0, 'assetId']],
    ]);
  });
});

describe('validateBlocks: links', () => {
  it.each([
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//example.com/path',
    'HTTPS://example.com',
    ' https://example.com',
    'https://example.com ',
    'https://user:secret@example.com/',
    '/wiki/Water',
    '',
  ])("SEC-08: rejects a link that isn't https: %j", (href) => {
    expect(reasons([paragraph(text('See '), link(href, text('this page')))])).toEqual([
      ['invalid_link', [0, 'children', 1, 'href']],
    ]);
  });

  it('SEC-08: checks links inside quotes and list items too', () => {
    const insecure = link('http://example.com', text('Example'));

    expect(
      reasons([
        { type: 'quote', children: [insecure] },
        {
          type: 'list',
          ordered: false,
          items: [{ children: [text('One')] }, { children: [insecure] }],
        },
      ]),
    ).toEqual([
      ['invalid_link', [0, 'children', 0, 'href']],
      ['invalid_link', [1, 'items', 1, 'children', 0, 'href']],
    ]);
  });

  it('SEC-08: rejects a link with no target', () => {
    expect(reasons([paragraph({ type: 'link', children: [text('Example')] })])).toEqual([
      ['missing_field', [0, 'children', 0, 'href']],
    ]);
  });

  it.each([[null], [42], [['https://example.com']], [{ url: 'https://example.com' }]])(
    'SEC-08: rejects the link target %j, which is not a string',
    (href) => {
      expect(reasons([paragraph(link(href, text('Example')))])).toEqual([
        ['invalid_type', [0, 'children', 0, 'href']],
      ]);
    },
  );

  it('SEC-08: rejects a link inside a link', () => {
    const inner = link('https://example.org', text('inner'));

    expect(reasons([paragraph(link('https://example.com', inner))])).toEqual([
      ['unknown_type', [0, 'children', 0, 'children', 0, 'type']],
    ]);
  });

  it('SEC-08: explains each link problem in its own words', () => {
    const messages = ['http://example.com', ' https://example.com', 'https://user@example.com']
      .map((href) => issuesFor([paragraph(link(href, text('Example')))]))
      .map(([issue]) => issue?.message);

    expect(new Set(messages).size).toBe(3);
    expect(messages[0]).toContain('https://');
  });
});

describe('validateBlocks: text alternatives', () => {
  it.each([
    ['missing_field', { type: 'image', assetId: 'asset_1' }],
    ['empty', { type: 'image', assetId: 'asset_1', alt: '' }],
    ['empty', { type: 'image', assetId: 'asset_1', alt: '   ' }],
    ['empty', { type: 'image', assetId: 'asset_1', alt: '\u200b\u00a0' }],
    ['invalid_type', { type: 'image', assetId: 'asset_1', alt: null }],
  ])('A11Y-10: rejects an image block without alt text (%s): %j', (code, block) => {
    expect(reasons([block])).toEqual([[code, [0, 'alt']]]);
  });

  it.each([
    ['missing_field', { type: 'audio', assetId: 'asset_2' }],
    ['empty', { type: 'audio', assetId: 'asset_2', transcript: '' }],
    ['empty', { type: 'audio', assetId: 'asset_2', transcript: ' \n ' }],
  ])('A11Y-10: rejects an audio block without a transcript (%s): %j', (code, block) => {
    expect(reasons([block])).toEqual([[code, [0, 'transcript']]]);
  });
});

describe('validateBlocks: empty content', () => {
  it('§11.3: rejects an empty block list', () => {
    expect(issuesFor([])).toEqual([
      { code: 'empty', path: [], blockIndex: null, blockType: null, message: anyReason },
    ]);
  });

  it.each([
    ['a paragraph with no children', paragraph(), [0, 'children']],
    ['an empty text span', paragraph(text('')), [0, 'children', 0, 'text']],
    ['a paragraph of whitespace', paragraph(text('  '), text('\u00a0\u200b')), [0, 'children']],
    ['a quote with no children', { type: 'quote', children: [] }, [0, 'children']],
    ['a quote of whitespace', { type: 'quote', children: [text(' ')] }, [0, 'children']],
    ['a list with no items', { type: 'list', ordered: true, items: [] }, [0, 'items']],
    [
      'a list item with no children',
      { type: 'list', ordered: true, items: [{ children: [] }] },
      [0, 'items', 0, 'children'],
    ],
    [
      'a list item of whitespace',
      {
        type: 'list',
        ordered: true,
        items: [{ children: [text('One')] }, { children: [text(' ')] }],
      },
      [0, 'items', 1, 'children'],
    ],
    ['a link with no text', paragraph(link('https://example.com')), [0, 'children', 0, 'children']],
    [
      'a link of whitespace',
      paragraph(text('See '), link('https://example.com', text(' '))),
      [0, 'children', 1, 'children'],
    ],
    ['a math block with no LaTeX', { type: 'math', latex: '' }, [0, 'latex']],
    ['a math block of whitespace', { type: 'math', latex: ' \n\t' }, [0, 'latex']],
    [
      'a code block with no source',
      { type: 'code', language: 'python', source: '' },
      [0, 'source'],
    ],
    [
      'a code block of whitespace',
      { type: 'code', language: 'python', source: '\n\n' },
      [0, 'source'],
    ],
  ])('§11.3: rejects %s', (_label, block, path) => {
    expect(reasons([block])).toEqual([['empty', path]]);
  });

  it('§11.3: accepts whitespace between visible spans, and a paragraph that is only a link', () => {
    expectValid([
      paragraph(text('a', ['bold']), text(' '), text('b', ['italic'])),
      paragraph(text(' '), link('https://example.com', text('Example'))),
    ]);
  });
});

describe('validateBlocks: what an author is told', () => {
  it('reports every problem with its block, its field and a reason to act on', () => {
    const content = [
      paragraph(text('Fine.')),
      paragraph(text('See '), link('http://example.com', text('this page'))),
      { type: 'image', assetId: 'asset_1' },
      { type: 'video', src: 'https://example.com/clip.mp4' },
    ];

    expect(issuesFor(content)).toEqual([
      {
        code: 'invalid_link',
        path: [1, 'children', 1, 'href'],
        blockIndex: 1,
        blockType: 'paragraph',
        message: mentioning('https://'),
      },
      {
        code: 'missing_field',
        path: [2, 'alt'],
        blockIndex: 2,
        blockType: 'image',
        message: mentioning('alt'),
      },
      {
        code: 'unknown_type',
        path: [3, 'type'],
        blockIndex: 3,
        blockType: null,
        message: mentioning('video'),
      },
    ]);
  });

  it('names the extra key and the kinds of content that are allowed', () => {
    const [extraKey] = issuesFor([{ ...paragraph(text('Hello')), html: '<b>Hello</b>' }]);
    const [rawHtml] = issuesFor('<p>Hello</p>');
    const [unknownType] = issuesFor([{ type: 'html' }]);

    expect(extraKey?.message).toContain('html');
    expect(rawHtml?.message).toContain('HTML');
    expect(unknownType?.message).toContain('paragraph');
  });

  it('keeps a reason short when the value at fault is huge', () => {
    const huge = 'x'.repeat(100_000);
    const [unknownType] = issuesFor([{ type: huge }]);
    const [extraKey] = issuesFor([{ ...paragraph(text('Hello')), [huge]: true }]);

    expect(unknownType?.message.length).toBeLessThan(300);
    expect(extraKey?.message.length).toBeLessThan(300);
  });
});
