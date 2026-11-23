// How many slips separate two typed answers (spec QT-03, typo tolerance).

/**
 * The optimal string alignment distance between `a` and `b`, counted in code points: an insert,
 * a delete, a substitution and a swap of two adjacent characters are one edit each.
 *
 * `max` is a whole number of edits, 0 or more. Any distance above it is reported as `max + 1`,
 * and nothing beyond it is computed: only the cells within `max` of the diagonal are filled, so
 * the work is the length of the text times `2 × max + 1`, however long or different the texts.
 */
export function editDistance(a: string, b: string, max: number): number {
  const tooFar = max + 1;
  const from = Array.from(a);
  const to = Array.from(b);
  // Each edit changes the length by at most one.
  if (Math.abs(from.length - to.length) > max) return tooFar;

  // Row i holds the distance from the first i characters of `from` to the first j of `to`, for
  // j from i − max to i + max, at index j − i + max. A cell outside that band is over the limit.
  const read = (row: readonly number[], index: number): number => row[index] ?? tooFar;
  const width = 2 * max + 1;

  let twoBack: readonly number[] = [];
  let previous: readonly number[] = [];
  for (let i = 0; i <= from.length; i += 1) {
    const current: number[] = [];
    let closest = tooFar;

    for (let index = 0; index < width; index += 1) {
      const j = i + index - max;
      let cell = tooFar;

      if (j >= 0 && j <= to.length) {
        if (i === 0 || j === 0) {
          cell = i + j;
        } else {
          const substitution = read(previous, index) + (from[i - 1] === to[j - 1] ? 0 : 1);
          const deletion = read(previous, index + 1) + 1;
          const insertion = read(current, index - 1) + 1;
          cell = Math.min(substitution, deletion, insertion);

          if (i > 1 && j > 1 && from[i - 1] === to[j - 2] && from[i - 2] === to[j - 1]) {
            cell = Math.min(cell, read(twoBack, index) + 1);
          }
        }
      }
      current.push(Math.min(cell, tooFar));
      closest = Math.min(closest, cell);
    }
    // A distance never falls from one row to the next, so nothing further can come back in range.
    if (closest > max) return tooFar;

    twoBack = previous;
    previous = current;
  }
  return read(previous, to.length - from.length + max);
}
