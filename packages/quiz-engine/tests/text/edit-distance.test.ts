import { describe, expect, it } from 'vitest';
import { editDistance } from '../../src/text/edit-distance.ts';

describe('editDistance', () => {
  it('editDistance counts insert, delete, substitute and adjacent swap as one edit', () => {
    expect(editDistance('paris', 'paris', 2)).toBe(0);
    expect(editDistance('pais', 'paris', 2)).toBe(1);
    expect(editDistance('pariss', 'paris', 2)).toBe(1);
    expect(editDistance('patis', 'paris', 2)).toBe(1);
    expect(editDistance('parsi', 'paris', 2)).toBe(1);
    expect(editDistance('austria', 'australia', 2)).toBe(2);
    expect(editDistance('', 'ab', 2)).toBe(2);
    expect(editDistance('', '', 0)).toBe(0);
  });

  it('editDistance counts code points, not UTF-16 units', () => {
    expect(editDistance('a😀b', 'ab', 2)).toBe(1);
    expect(editDistance('😀', '😃', 2)).toBe(1);
  });

  it('a swap is one edit only for two adjacent characters, used once', () => {
    // Optimal string alignment: "ca" to "abc" is 3, where unrestricted Damerau gives 2.
    expect(editDistance('ca', 'abc', 3)).toBe(3);
    expect(editDistance('abcd', 'badc', 3)).toBe(2);
  });

  it('editDistance stops once the distance exceeds max', () => {
    expect(editDistance('kitten', 'sitting', 1)).toBe(2);
    expect(editDistance('kitten', 'sitting', 3)).toBe(3);
    expect(editDistance('abc', 'abd', 0)).toBe(1);
    expect(editDistance('abc', 'abc', 0)).toBe(0);
    expect(editDistance('a'.repeat(256), 'b'.repeat(256), 2)).toBe(3);
    // Lengths further apart than max: nothing is compared.
    expect(editDistance('a', 'a'.repeat(100_000), 2)).toBe(3);
  });

  it('long strings that differ everywhere cost a few rows, not a full table', () => {
    const started = Date.now();

    expect(editDistance('a'.repeat(200_000), 'b'.repeat(200_000), 3)).toBe(4);
    // A full table would be 4 × 10^10 cells. The cut-off leaves a handful of rows.
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('long strings that are nearly equal cost one narrow band', () => {
    const long = 'ab'.repeat(50_000);
    const started = Date.now();

    expect(editDistance(long, `${long.slice(0, 70_000)}x${long.slice(70_000)}`, 3)).toBe(1);
    // A full table would be 10^10 cells. The band is 7 cells wide.
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
