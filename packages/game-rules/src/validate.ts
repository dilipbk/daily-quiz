/** Throws unless `value` is a whole number of zero or more, so no `NaN` reaches a ledger. */
export function assertCount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole number of zero or more, got ${String(value)}`);
  }
}
