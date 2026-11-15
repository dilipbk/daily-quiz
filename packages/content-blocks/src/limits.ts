/**
 * Size limits for content blocks (ADR 0003). Lengths are counted in Unicode code points, so a
 * letter, a CJK character and an emoji each count once. Editors and the content pipeline read
 * their limits here, so they can't drift from what validation enforces.
 */
export const blockLimits = {
  /** Blocks in one piece of content: a prompt, an option or an explanation. */
  blocks: 32,
  /** Items in one list. */
  listItems: 32,
  /** Text spans and links in one paragraph, quote or list item; text spans in one link. */
  inlines: 64,
  /** Characters in one text span. */
  textLength: 2000,
  /** Characters of LaTeX in one math block. */
  latexLength: 2000,
  /** Characters of source in one code block. */
  sourceLength: 4000,
  /** Characters of alt text on one image. */
  altLength: 500,
  /** Characters in one audio transcript. */
  transcriptLength: 2000,
  /** Characters of text in one piece of content, all of its blocks together. */
  totalLength: 10_000,
  /** Characters in a link's `href`. */
  hrefLength: 2048,
} as const;
