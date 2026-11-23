import type * as z from 'zod';

// Helpers for tests that hand a schema something it must refuse. They take and return loosely
// typed values on purpose: a refused value is one the types wouldn't let a test write.

/** A copy of an object with one key left out. */
export const without = (value: object, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

/** A copy of an object with one key replaced or added. */
export const withValue = (value: object, key: string, replacement: unknown): unknown => ({
  ...value,
  [key]: replacement,
});

export const accepts = (schema: z.ZodType, value: unknown): boolean =>
  schema.safeParse(value).success;
