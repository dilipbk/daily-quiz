/** Why content was refused. The codes are stable: tools and translated messages key on them. */
export type BlockIssueCode =
  /** The content isn't a list of blocks at all: an HTML or Markdown string, say. */
  | 'not_a_block_list'
  /** A block or inline `type` that doesn't exist, or isn't allowed where it stands. */
  | 'unknown_type'
  /** A key that the block or inline doesn't have. */
  | 'unknown_field'
  /** A required field is absent. */
  | 'missing_field'
  /** A field holds the wrong kind of value: a string where a list belongs, say. */
  | 'invalid_type'
  /** A value outside what the field allows. */
  | 'invalid_value'
  /** A link target that isn't a canonical https URL. */
  | 'invalid_link'
  /** Nothing to show: no blocks, no items, no text, or only whitespace. */
  | 'empty'
  /** More characters or more items than `blockLimits` allows. */
  | 'too_long'
  /** A control character, a lone surrogate, or a line break in a single line of text. */
  | 'unsupported_character';
