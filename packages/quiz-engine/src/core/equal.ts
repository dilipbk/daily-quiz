// Structural equality for plain JSON values: what grades, fixtures and parsed content are made of.

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/** The value under an own key. An inherited name such as "constructor" reads as absent. */
const ownValue = (record: object, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Readonly<Record<string, unknown>>)[key]
    : undefined;

/**
 * Key order doesn't matter and array order does. `0` equals `-0`, and a missing key equals one
 * set to `undefined`, so a value compares equal to itself after a trip through JSON.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (isList(a) || isList(b)) {
    if (!isList(a) || !isList(b) || a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (!deepEqual(a[index], b[index])) return false;
    }
    return true;
  }

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!deepEqual(ownValue(a, key), ownValue(b, key))) return false;
  }
  return true;
}
