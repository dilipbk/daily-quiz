import { blockLimits } from '@repo/content-blocks';
import type { Block, CodeBlock, MathBlock } from '@repo/content-blocks';
import * as z from 'zod';
import { httpsUrlSchema, idSchema } from './primitives.ts';
import { maxSvgLength, svgProblem } from './svg.ts';

// The published forms of content (spec §11.3, ADR 0022). An author writes blocks: a math block
// is LaTeX, a code block is source, an image block is an asset id. Publishing renders each one
// (MathJax to SVG, Shiki to tokens, sharp to image files), and a device draws what was rendered.
//
// The renderings travel beside the blocks, never inside them. The blocks a device receives are
// the blocks that were stored, so the engine's strict schemas still parse them and the device
// and the server grade the same JSON. A rendering is matched to its block by value: a media
// block by its asset id, a math block by its LaTeX, a code block by its language and source.

// Media

/** The container or codec of a file, such as `avif`, `webp` or `m4a`. A device skips what it can't play. */
const formatSchema = z.string().regex(/^[a-z0-9]{1,8}$/);
const bytesSchema = z.int().min(1).max(50_000_000);
const pixelsSchema = z.int().min(1).max(16_384);

/**
 * An image as files to fetch. It carries no alt text: the block that shows the image does,
 * because the right words depend on the question (ADR 0008).
 */
export const imageAssetSchema = z.object({
  assetId: idSchema,
  kind: z.literal('image'),
  /** The image's own size in pixels: its shape is known before any file has loaded. */
  width: pixelsSchema,
  height: pixelsSchema,
  /** What to draw while it loads. */
  placeholder: z
    .object({ kind: z.enum(['blurhash', 'thumbhash']), hash: z.string().min(1).max(128) })
    .nullable(),
  /** The same picture in several formats and widths; the device picks one. */
  sources: z
    .array(
      z.object({
        url: httpsUrlSchema,
        format: formatSchema,
        width: pixelsSchema,
        bytes: bytesSchema,
      }),
    )
    .min(1)
    .max(12),
});

/** An audio clip as files to fetch. The block that plays it carries the transcript. */
export const audioAssetSchema = z.object({
  assetId: idSchema,
  kind: z.literal('audio'),
  /** Clips run to 30 seconds at most (spec §11.3). */
  durationMs: z.int().min(1).max(30_000),
  sources: z
    .array(z.object({ url: httpsUrlSchema, format: formatSchema, bytes: bytesSchema }))
    .min(1)
    .max(4),
});

export const mediaAssetSchema = z.discriminatedUnion('kind', [imageAssetSchema, audioAssetSchema]);

// Math

/**
 * One `<svg>` element in the small grammar of `./svg.ts`: shapes and text only, with nothing that
 * runs, loads, links or styles (SEC-08). The SVG comes from our own publish pipeline; the grammar
 * is there so that a fault upstream can't put active markup in front of a player.
 */
const svgSchema = z
  .string()
  .max(maxSvgLength)
  .superRefine((value, context) => {
    const problem = svgProblem(value);
    if (problem !== null) context.addIssue({ code: 'custom', message: problem });
  });

/** A size in `ex`, the unit MathJax measures in: the device scales it by its text size. */
const exSchema = z.number().positive().max(1000);

export const mathRenderingSchema = z.object({
  /** The block's LaTeX, exactly as stored: what this rendering is matched by. */
  latex: z.string().min(1).max(blockLimits.latexLength),
  /** Drawn in `currentColor`, so the device's theme colours it. */
  svg: svgSchema,
  widthEx: exSchema,
  heightEx: exSchema,
});

// Code

/**
 * The token kinds the app has a colour for. A kind is a word, and a kind this build doesn't know
 * is drawn as `plain`, so the pipeline can add one without breaking a shipped app.
 */
export const codeTokenKinds = [
  'plain',
  'keyword',
  'string',
  'number',
  'comment',
  'function',
  'type',
  'variable',
  'constant',
  'operator',
  'punctuation',
] as const;

export type CodeTokenKind = (typeof codeTokenKinds)[number];

const tokenSchema = z.object({
  /** A run of the source on one line. */
  text: z
    .string()
    .min(1)
    .max(blockLimits.sourceLength)
    .regex(/^[^\n]*$/),
  kind: z.string().regex(/^[a-z_]{1,32}$/),
});

export const codeRenderingSchema = z
  .object({
    /** The block's language and source, exactly as stored: what this rendering is matched by. */
    language: z
      .string()
      .max(32)
      .regex(/^[^\s]+$/),
    source: z.string().min(1).max(blockLimits.sourceLength),
    /** The source as lines of tokens. An empty line is an empty list. */
    lines: z
      .array(z.array(tokenSchema).max(blockLimits.sourceLength))
      .min(1)
      .max(blockLimits.sourceLength),
  })
  .refine(
    ({ source, lines }) =>
      lines.map((line) => line.map((token) => token.text).join('')).join('\n') === source,
    { error: 'The tokens, joined line by line, must spell the source exactly.', path: ['lines'] },
  );

// Renderings

const hasNoRepeats = (keys: readonly string[]): boolean => new Set(keys).size === keys.length;

/** Language and source as one key, written so that no two different pairs share one. */
const codeKey = (code: { readonly language: string; readonly source: string }): string =>
  JSON.stringify([code.language, code.source]);

/**
 * Everything rendered for one piece of a question. All three lists are always present, and a
 * question with only text has three empty ones.
 */
export const renderingsSchema = z.object({
  media: z
    .array(mediaAssetSchema)
    .max(64)
    .refine((assets) => hasNoRepeats(assets.map((asset) => asset.assetId)), {
      error: 'List each asset once.',
    }),
  math: z
    .array(mathRenderingSchema)
    .max(64)
    .refine((formulas) => hasNoRepeats(formulas.map((formula) => formula.latex)), {
      error: 'List each formula once.',
    }),
  code: z
    .array(codeRenderingSchema)
    .max(32)
    .refine((listings) => hasNoRepeats(listings.map(codeKey)), {
      error: 'List each code listing once.',
    }),
});

export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type AudioAsset = z.infer<typeof audioAssetSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MathRendering = z.infer<typeof mathRenderingSchema>;
export type CodeRendering = z.infer<typeof codeRenderingSchema>;
export type Renderings = z.infer<typeof renderingsSchema>;

// Lookups: the one place that says how a block finds its rendering.

export function assetOf(assetId: string, renderings: Renderings): MediaAsset | undefined {
  return renderings.media.find((asset) => asset.assetId === assetId);
}

export function mathRenderingOf(
  block: MathBlock,
  renderings: Renderings,
): MathRendering | undefined {
  return renderings.math.find((formula) => formula.latex === block.latex);
}

export function codeRenderingOf(
  block: CodeBlock,
  renderings: Renderings,
): CodeRendering | undefined {
  return renderings.code.find((listing) => codeKey(listing) === codeKey(block));
}

/**
 * The blocks that need a rendering and have none: a math or code block with no match, an image
 * block whose asset is missing or is not an image, and the same for audio. Text blocks need
 * nothing. The publish pipeline uses it as a gate; the app uses it to know what it can draw.
 */
export function unrenderedBlocks(blocks: readonly Block[], renderings: Renderings): Block[] {
  return blocks.filter((block) => {
    switch (block.type) {
      case 'math':
        return mathRenderingOf(block, renderings) === undefined;
      case 'code':
        return codeRenderingOf(block, renderings) === undefined;
      case 'image':
        return assetOf(block.assetId, renderings)?.kind !== 'image';
      case 'audio':
        return assetOf(block.assetId, renderings)?.kind !== 'audio';
      default:
        return false;
    }
  });
}
