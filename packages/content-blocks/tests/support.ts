import { expect } from 'vitest';
import { blocksSchema, validateBlocks } from '../src/index.ts';
import type { BlockIssue } from '../src/index.ts';

// Builders take `unknown` on purpose: most tests hand the validator something it must refuse.

export const text = (value: unknown, marks?: unknown) =>
  marks === undefined ? { type: 'text', text: value } : { type: 'text', text: value, marks };

export const link = (href: unknown, ...children: unknown[]) => ({ type: 'link', href, children });

export const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children });

/** Valid by the entry point and by the schema alike, and returned as it was given. */
export function expectValid(content: unknown): void {
  expect(validateBlocks(content)).toEqual({ ok: true, blocks: content });
  expect(blocksSchema.safeParse(content).success).toBe(true);
}

/** Invalid by the entry point and by the schema alike; returns what the entry point reports. */
export function issuesFor(content: unknown): BlockIssue[] {
  const result = validateBlocks(content);

  expect(blocksSchema.safeParse(content).success).toBe(false);
  if (result.ok) throw new Error('Expected the content to fail validation.');
  return result.issues;
}

/** Each issue as `[why, where]`. */
export const reasons = (content: unknown) =>
  issuesFor(content).map((issue) => [issue.code, issue.path]);
