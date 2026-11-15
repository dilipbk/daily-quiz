import * as z from 'zod';
import { httpsUrlProblem } from './https-url.ts';
import type { HttpsUrlProblem } from './https-url.ts';
import type { BlockIssueCode } from './issue.ts';
import { blockLimits } from './limits.ts';

// Three properties hold for every schema here (ADR 0003):
// - Objects are strict. A key the schema doesn't name is an error, never ignored, which is what
//   keeps HTML, styles and handlers out of content (SEC-08).
// - Nothing transforms its input, so what passes validation is exactly what was stored.
// - No schema refers to itself. Content can't nest deeper than the schema is written, and
//   validation can't be made to recurse by what it is given.

/**
 * Options for a custom check. The reason code travels in `params`, where `validateBlocks` reads
 * it; `abort` stops later checks from piling more reasons onto the same value.
 */
const because = (code: BlockIssueCode, message: string) => ({
  error: message,
  params: { code },
  abort: true,
});

// Text

// A character a reader can see: not whitespace, a separator, a format or a control character.
const VISIBLE_CHARACTER = /[^\s\p{Z}\p{Cf}\p{Cc}]/u;
const hasVisibleText = (value: string): boolean => VISIBLE_CHARACTER.test(value);

// Control characters and unpaired surrogates are invisible, and storage refuses some of them:
// Postgres takes neither a null character nor half of a surrogate pair. A single line of text
// takes no line break either; code, LaTeX and transcripts keep their line feeds and tabs.
const UNSUPPORTED_IN_A_LINE = /[\p{Cc}\p{Cs}\u2028\u2029]/u;
const UNSUPPORTED_IN_LINES = /(?![\n\t])[\p{Cc}\p{Cs}]/u;

const fitsOnOneLine = (value: string): boolean => !UNSUPPORTED_IN_A_LINE.test(value);
const oneLineOnly = because(
  'unsupported_character',
  'Remove the control character or line break. This text runs on one line: start a new block for a new line.',
);

const keepsOnlyLineBreaks = (value: string): boolean => !UNSUPPORTED_IN_LINES.test(value);
const lineBreaksOnly = because(
  'unsupported_character',
  'Remove the control character. Line feeds and tabs are the only ones allowed, so end lines with "\\n", not "\\r\\n".',
);

/** A single line that must say something: alt text. */
const lineOfText = (maxLength: number, whenEmpty: string) =>
  z
    .string()
    .max(maxLength, { abort: true })
    .refine(hasVisibleText, because('empty', whenEmpty))
    .refine(fitsOnOneLine, oneLineOnly);

/** Text that keeps its line feeds and tabs, and must say something: LaTeX, code, transcripts. */
const linesOfText = (maxLength: number, whenEmpty: string) =>
  z
    .string()
    .max(maxLength, { abort: true })
    .refine(hasVisibleText, because('empty', whenEmpty))
    .refine(keepsOnlyLineBreaks, lineBreaksOnly);

// Marks and inline content

const markSchema = z.enum(['bold', 'italic', 'code', 'subscript', 'superscript']);

const marksSchema = z
  .array(markSchema)
  .max(markSchema.options.length, { abort: true })
  .refine(
    (marks) => new Set(marks).size === marks.length,
    because('invalid_value', 'List each mark once.'),
  )
  .refine(
    (marks) => !(marks.includes('subscript') && marks.includes('superscript')),
    because('invalid_value', 'Text is subscript or superscript, not both. Remove one.'),
  );

const textSchema = z.strictObject({
  type: z.literal('text'),
  // A span may be whitespace alone (the space between two marked words); its container must not.
  text: z
    .string()
    .min(1, { abort: true })
    .max(blockLimits.textLength, { abort: true })
    .refine(fitsOnOneLine, oneLineOnly),
  marks: marksSchema.optional(),
});

const linkProblems: Record<HttpsUrlProblem, string> = {
  too_long: 'This link is too long. Use a shorter address.',
  whitespace: 'Remove the spaces and line breaks from this link, including any at either end.',
  scheme:
    'A link must start with "https://", in lowercase. Other schemes (http:, javascript:, data:) and relative addresses are not allowed.',
  credentials: 'Remove the user name or password from this link: nothing may come before an "@".',
  port: 'Remove the port number from this link.',
  host: 'A link must point to a domain name in lowercase, such as "example.org". IP addresses and "localhost" are not allowed, and a non-Latin domain is written in its "xn--" form.',
  characters:
    'This link contains a character that must be percent-encoded: a non-ASCII letter, a quote, a bracket or a backslash, for example.',
};

const hrefSchema = z.string().superRefine((value, ctx) => {
  const problem = httpsUrlProblem(value);

  if (problem !== null) {
    ctx.addIssue({
      code: 'custom',
      message: linkProblems[problem],
      params: { code: 'invalid_link' satisfies BlockIssueCode },
    });
  }
});

const linkSchema = z.strictObject({
  type: z.literal('link'),
  href: hrefSchema,
  // A union of one, so that anything but text is reported as a type that isn't allowed here.
  children: z
    .array(z.discriminatedUnion('type', [textSchema]))
    .min(1, { abort: true })
    .max(blockLimits.inlines, { abort: true })
    .refine(
      (spans) => spans.some((span) => hasVisibleText(span.text)),
      because('empty', 'Give the link some visible text.'),
    ),
});

const inlineSchema = z.discriminatedUnion('type', [textSchema, linkSchema]);

/** The text of every span, with the spans inside links included. */
const spanTexts = (inlines: Inline[]): string[] =>
  inlines.flatMap((inline) =>
    inline.type === 'text' ? [inline.text] : inline.children.map((span) => span.text),
  );

const inlinesSchema = z
  .array(inlineSchema)
  .min(1, { abort: true })
  .max(blockLimits.inlines, { abort: true })
  .refine(
    (inlines) => spanTexts(inlines).some(hasVisibleText),
    because('empty', 'Add some visible text: this holds only whitespace.'),
  );

// Blocks

// An id, never an address: media comes from the asset store, so no block can point a device at
// an arbitrary URL.
const assetIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, {
  error:
    'Reference a media asset by its id (letters, digits, "-" and "_"). A URL or a file path is not accepted.',
});

const paragraphSchema = z.strictObject({
  type: z.literal('paragraph'),
  children: inlinesSchema,
});

const mathSchema = z.strictObject({
  type: z.literal('math'),
  latex: linesOfText(blockLimits.latexLength, 'Add the LaTeX source.'),
});

const codeSchema = z.strictObject({
  type: z.literal('code'),
  language: z.string().regex(/^[a-z0-9][a-z0-9+#._-]{0,31}$/, {
    error: 'Name the language with a short lowercase id, such as "python" or "c++".',
  }),
  source: linesOfText(blockLimits.sourceLength, 'Add the source code.'),
});

/** An image block on its own, for content that must be exactly one image: an `image_choice` option. */
export const imageBlockSchema = z.strictObject({
  type: z.literal('image'),
  assetId: assetIdSchema,
  alt: lineOfText(blockLimits.altLength, 'Describe the image for someone who cannot see it.'),
});

const audioSchema = z.strictObject({
  type: z.literal('audio'),
  assetId: assetIdSchema,
  transcript: linesOfText(
    blockLimits.transcriptLength,
    'Write out what the clip says for someone who cannot hear it.',
  ),
});

const quoteSchema = z.strictObject({
  type: z.literal('quote'),
  children: inlinesSchema,
});

const listSchema = z.strictObject({
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z
    .array(z.strictObject({ children: inlinesSchema }))
    .min(1, { abort: true })
    .max(blockLimits.listItems, { abort: true }),
});

/** One block of spec §11.3, told apart by its `type`. */
export const blockSchema = z.discriminatedUnion('type', [
  paragraphSchema,
  mathSchema,
  codeSchema,
  imageBlockSchema,
  audioSchema,
  quoteSchema,
  listSchema,
]);

/** Every string of a block that a reader reads or hears. */
function textsOf(block: Block): string[] {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
      return spanTexts(block.children);
    case 'list':
      return block.items.flatMap((item) => spanTexts(item.children));
    case 'math':
      return [block.latex];
    case 'code':
      return [block.source];
    case 'image':
      return [block.alt];
    case 'audio':
      return [block.transcript];
  }
}

/** Length in Unicode code points, the unit of every limit: all code units but the second of a pair. */
function codePoints(value: string): number {
  let count = 0;

  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit < 0xdc00 || unit > 0xdfff) count += 1;
  }
  return count;
}

/**
 * A piece of content: a question's prompt, one option or the explanation (QT-04). Compose it into
 * a larger zod schema, or call `validateBlocks` for reasons an author can act on.
 */
export const blocksSchema = z
  .array(blockSchema)
  .min(1, { abort: true })
  .max(blockLimits.blocks, { abort: true })
  .refine(
    (blocks) =>
      blocks.flatMap(textsOf).reduce((total, value) => total + codePoints(value), 0) <=
      blockLimits.totalLength,
    because(
      'too_long',
      `Shorten this content: all of its text together may run to ${String(blockLimits.totalLength)} characters.`,
    ),
  );

export type Mark = z.infer<typeof markSchema>;
export type TextSpan = z.infer<typeof textSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Inline = z.infer<typeof inlineSchema>;

export type ParagraphBlock = z.infer<typeof paragraphSchema>;
export type MathBlock = z.infer<typeof mathSchema>;
export type CodeBlock = z.infer<typeof codeSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type AudioBlock = z.infer<typeof audioSchema>;
export type QuoteBlock = z.infer<typeof quoteSchema>;
export type ListBlock = z.infer<typeof listSchema>;

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];

/** Every block type, in the order of spec §11.3. */
export const blockTypes: readonly BlockType[] = blockSchema.options.map(
  (option) => option.shape.type.value,
);
