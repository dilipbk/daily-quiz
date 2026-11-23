import type { Block, ImageBlock } from '@repo/content-blocks';

// Content for fixture questions, built the way an author's tool would store it.

/** One paragraph of plain text: what most options and items show. */
export const text = (value: string): Block[] => [
  { type: 'paragraph', children: [{ type: 'text', text: value }] },
];

/** One image from the asset store, with the alt text every image carries. */
export const image = (assetId: string, alt: string): ImageBlock => ({
  type: 'image',
  assetId,
  alt,
});
