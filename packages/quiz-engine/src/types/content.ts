// The one place a question type reaches into content blocks (ENG-01): what an option or an item
// shows. `blocksSchema` is a piece of content of at least one block; `imageBlockSchema` is exactly
// one image, and requires its alt text (A11Y-10). Both are strict and transform nothing, so parsed
// content is plain JSON and two pieces can be compared structurally.
export { blocksSchema, imageBlockSchema } from '@repo/content-blocks';
export type { Block, ImageBlock } from '@repo/content-blocks';
