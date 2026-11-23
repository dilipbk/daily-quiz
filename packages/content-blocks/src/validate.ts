import type * as z from 'zod';
import type { BlockIssueCode } from './issue.ts';
import { blockTypes, blocksSchema } from './schema.ts';
import type { Block, BlockType } from './schema.ts';

/** One reason content was refused: which block, which field, and why. */
export interface BlockIssue {
  code: BlockIssueCode;
  /**
   * The reason in plain English, for authors and tools. It doesn't repeat the location. A screen
   * shown to players translates by `code` instead.
   */
  message: string;
  /** Where, from the root of the content: `[1, 'children', 2, 'href']`. */
  path: (string | number)[];
  /** The position of the block at fault, or `null` when the list itself is. */
  blockIndex: number | null;
  /** That block's type, or `null` when it has none that the schema knows. */
  blockType: BlockType | null;
}

export type BlockValidationResult =
  { ok: true; blocks: Block[] } | { ok: false; issues: BlockIssue[] };

type Path = BlockIssue['path'];

/** The value at `path`, following own properties only; `undefined` when the path leads nowhere. */
function valueAt(root: unknown, path: Path): unknown {
  let value = root;

  for (const key of path) {
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

const kinds: Record<string, string> = {
  array: 'a list',
  boolean: 'true or false',
  number: 'a number',
  object: 'an object',
  string: 'a string',
};

const kindOf = (value: unknown): string => {
  if (value === null) return 'null';
  return kinds[Array.isArray(value) ? 'array' : typeof value] ?? typeof value;
};

const MAX_QUOTED_LENGTH = 40;

/** A value as a message shows it: a string in quotes, cut short if it is long; else its kind. */
const quoted = (value: unknown): string => {
  if (typeof value !== 'string') return kindOf(value);
  return JSON.stringify(
    value.length > MAX_QUOTED_LENGTH ? `${value.slice(0, MAX_QUOTED_LENGTH)}...` : value,
  );
};

const oneOf = (values: readonly unknown[] = []): string =>
  values.length === 1 ? quoted(values[0]) : `one of ${values.map(quoted).join(', ')}`;

/** Turns one zod issue into the reasons an author reads. */
function explain(issue: z.core.$ZodIssue, content: readonly unknown[]): BlockIssue[] {
  const path = issue.path.map((key) => (typeof key === 'symbol' ? key.toString() : key));
  const value = valueAt(content, path);

  const at = (code: BlockIssueCode, message: string, where: Path = path): BlockIssue => {
    const blockIndex = typeof where[0] === 'number' ? where[0] : null;
    const type = blockIndex === null ? undefined : valueAt(content, [blockIndex, 'type']);

    return {
      code,
      message,
      path: where,
      blockIndex,
      blockType: blockTypes.find((known) => known === type) ?? null,
    };
  };

  switch (issue.code) {
    case 'unrecognized_keys':
      return issue.keys.map((key) =>
        at('unknown_field', `${quoted(key)} is not a field that belongs here. Remove it.`, [
          ...path,
          key,
        ]),
      );

    // The schema's only unions are told apart by `type`, so this is always a `type` at fault.
    case 'invalid_union': {
      const allowed = oneOf('options' in issue ? issue.options : []);

      return [
        value === undefined
          ? at('missing_field', `Add a "type": ${allowed}.`)
          : at('unknown_type', `${quoted(value)} is not a type allowed here. Use ${allowed}.`),
      ];
    }

    case 'invalid_type': {
      const field = path.at(-1);

      return [
        value === undefined
          ? at(
              'missing_field',
              `${typeof field === 'string' ? quoted(field) : 'A value'} is required.`,
            )
          : at(
              'invalid_type',
              `Expected ${kinds[issue.expected] ?? issue.expected}, found ${kindOf(value)}.`,
            ),
      ];
    }

    case 'invalid_value':
      return [at('invalid_value', `Use ${oneOf(issue.values)}.`)];

    case 'too_small':
      return [at('empty', issue.origin === 'array' ? 'Add at least one item.' : 'Add some text.')];

    case 'too_big': {
      const unit = issue.origin === 'array' ? 'items' : 'characters';

      return [at('too_long', `Keep this to ${String(issue.maximum)} ${unit} or fewer.`)];
    }

    case 'custom': {
      const code: unknown = issue.params?.code;

      // Custom issues come only from this package's own checks, which always name their code.
      return [
        at(typeof code === 'string' ? (code as BlockIssueCode) : 'invalid_value', issue.message),
      ];
    }

    // A pattern that didn't match: the schema wrote that message itself.
    default:
      return [at('invalid_value', issue.message)];
  }
}

/**
 * Checks that `input` is content made of structured blocks (spec §11.3, SEC-08). On success it
 * returns the blocks, typed and unchanged; on failure, every reason found, each with its block,
 * its field and what to do about it. Any value JSON can carry gets a result, never an exception.
 */
export function validateBlocks(input: unknown): BlockValidationResult {
  if (!Array.isArray(input)) {
    const message =
      typeof input === 'string'
        ? 'Content must be a list of blocks. A string of HTML, Markdown or plain text is not accepted.'
        : `Content must be a list of blocks, not ${kindOf(input)}.`;

    return {
      ok: false,
      issues: [{ code: 'not_a_block_list', message, path: [], blockIndex: null, blockType: null }],
    };
  }

  const content: readonly unknown[] = input;
  const result = blocksSchema.safeParse(content);

  if (result.success) return { ok: true, blocks: result.data };
  return { ok: false, issues: result.error.issues.flatMap((issue) => explain(issue, content)) };
}
