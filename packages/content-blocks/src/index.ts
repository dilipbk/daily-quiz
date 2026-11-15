// Block schema and validation (spec §11.3, QT-04, SEC-08). Pure TypeScript: no platform APIs.
export { isHttpsUrl } from './https-url.ts';
export type { BlockIssueCode } from './issue.ts';
export { blockLimits } from './limits.ts';
export { blockSchema, blocksSchema, blockTypes } from './schema.ts';
export type {
  AudioBlock,
  Block,
  BlockType,
  CodeBlock,
  ImageBlock,
  Inline,
  Link,
  ListBlock,
  Mark,
  MathBlock,
  ParagraphBlock,
  QuoteBlock,
  TextSpan,
} from './schema.ts';
export { validateBlocks } from './validate.ts';
export type { BlockIssue, BlockValidationResult } from './validate.ts';
