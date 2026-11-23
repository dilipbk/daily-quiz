import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { maxSvgLength, svgProblem } from '../../src/svg.ts';

// The grammar reads a string once. An earlier version scanned with a regular expression that
// started again from every position after a miss, and 200,000 characters took over a minute.
// These hold the longest strings it will read to a bound far above what one pass needs and far
// below what a second pass over the rest would cost.

const root = '<svg xmlns="http://www.w3.org/2000/svg">';
const fill = (prefix: string, unit: string, suffix: string): string =>
  prefix +
  unit.repeat(Math.floor((maxSvgLength - prefix.length - suffix.length) / unit.length)) +
  suffix;

const millisecondsToCheck = (svg: string): number => {
  const start = performance.now();
  svgProblem(svg);
  return performance.now() - start;
};

describe('the SVG grammar is linear', () => {
  it.each([
    ['a tag that never closes', fill('<', 'a', '')],
    ['white space inside one tag', fill('<svg', ' ', '></svg>')],
    [
      'white space inside the root',
      fill('<svg xmlns="http://www.w3.org/2000/svg"', ' ', '></svg>'),
    ],
    ['a tag opened at every character', fill('', '<', '')],
    ['a tag opened at every second character', fill(root, '<a', '</svg>')],
    ['thousands of elements', fill(root, '<g></g>', '</svg>')],
    ['thousands of attributes on one element', fill(`${root}<g`, ' data-a="1"', '></g></svg>')],
    ['a quote that never closes, again and again', fill(`${root}<g `, 'a="', '')],
    ['a long run of text', fill(`${root}<text>`, 'x', '</text></svg>')],
    ['a long run of references', fill(`${root}<text>`, '&amp;', '</text></svg>')],
    ['a long run of broken references', fill(`${root}<text>`, '&', '</text></svg>')],
    ['one long path', fill(`${root}<path d="`, 'M0 0', '"></path></svg>')],
    ['one long transform', fill(`${root}<g transform="`, 'scale(1) ', '"></g></svg>')],
    ['one long style', fill(`${root}<g style="`, 'font-size:1px;', '"></g></svg>')],
  ])('%s', (_name, svg) => {
    expect(svg.length).toBeGreaterThan(maxSvgLength - 20);
    expect(svg.length).toBeLessThanOrEqual(maxSvgLength);
    expect(millisecondsToCheck(svg)).toBeLessThan(500);
  });

  it('accepts a drawing of the longest length in that time too', () => {
    const drawing = fill(`${root}<path d="`, 'M0 0', '"></path></svg>');

    expect(svgProblem(drawing)).toBeNull();
  });
});
