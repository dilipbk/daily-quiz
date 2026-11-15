import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod';
import {
  blockLimits,
  blocksSchema,
  blockTypes,
  imageBlockSchema,
  validateBlocks,
} from '../src/index.ts';
import type { Block, BlockType, ImageBlock, Link, ListBlock, TextSpan } from '../src/index.ts';
import { link, paragraph, text } from './support.ts';

describe('the block schema, as other packages use it', () => {
  // The shape ENG-02 gives a question: blocks in the prompt, in every option and in the explanation.
  const questionSchema = z.strictObject({
    prompt: blocksSchema,
    options: z.array(blocksSchema),
    explanation: blocksSchema,
  });

  const question = {
    prompt: [paragraph(text('Which gas do plants absorb?'))],
    options: [
      [paragraph(text('CO'), text('2', ['subscript']))],
      [{ type: 'math', latex: '\\ce{O2}' }],
    ],
    explanation: [
      paragraph(text('See '), link('https://en.wikipedia.org/wiki/Photosynthesis', text('more'))),
      { type: 'image', assetId: 'asset_1', alt: 'A leaf, with arrows for gas exchange.' },
    ],
  };

  it("QT-04: composes into a question's prompt, options and explanation", () => {
    expect(questionSchema.parse(question)).toEqual(question);
  });

  // The shape ENG-02 gives an `image_choice` option: exactly one image, with its alt text.
  it('QT-04: offers the image block alone, for an option that must be one image', () => {
    const image = { type: 'image', assetId: 'asset_1', alt: 'A red kite in flight.' };

    expect(imageBlockSchema.parse(image)).toEqual(image);
    expect(imageBlockSchema.safeParse({ type: 'image', assetId: 'asset_1' }).success).toBe(false);
    expect(imageBlockSchema.safeParse(paragraph(text('A red kite.'))).success).toBe(false);
  });

  it('QT-04: points at the option and the field when one option is at fault', () => {
    const insecure = [paragraph(link('http://example.com', text('more')))];
    const result = questionSchema.safeParse({
      ...question,
      options: [question.options[0], insecure],
    });

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['options', 1, 0, 'children', 0, 'href'],
    ]);
  });

  it('§11.3: knows the seven block types of the spec and no other', () => {
    expect(blockTypes).toEqual(['paragraph', 'math', 'code', 'image', 'audio', 'quote', 'list']);
    expectTypeOf<BlockType>().toEqualTypeOf<
      'paragraph' | 'math' | 'code' | 'image' | 'audio' | 'quote' | 'list'
    >();
  });

  it('§11.3: gives renderers one type per block, told apart by `type`', () => {
    expectTypeOf<ImageBlock>().toEqualTypeOf<{ type: 'image'; assetId: string; alt: string }>();
    expectTypeOf<Extract<Block, { type: 'list' }>>().toEqualTypeOf<ListBlock>();
    expectTypeOf<ListBlock['items'][number]['children'][number]>().toEqualTypeOf<TextSpan | Link>();
    expectTypeOf<Link['children'][number]>().toEqualTypeOf<TextSpan>();
  });

  it('§11.3: hands back typed blocks when the content is valid', () => {
    const result = validateBlocks(question.prompt);

    if (!result.ok) throw new Error('Expected the prompt to be valid.');
    expectTypeOf(result.blocks).toEqualTypeOf<Block[]>();
    expect(result.blocks).toEqual(question.prompt);
  });

  it('ENG-01: publishes the limits it enforces, for editors to show', () => {
    const atTheLimit = [paragraph(text('a'.repeat(blockLimits.textLength)))];
    const overTheLimit = [paragraph(text('a'.repeat(blockLimits.textLength + 1)))];

    expect(validateBlocks(atTheLimit).ok).toBe(true);
    expect(validateBlocks(overTheLimit).ok).toBe(false);
  });
});
