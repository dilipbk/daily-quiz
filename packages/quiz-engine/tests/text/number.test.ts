import { describe, expect, it } from 'vitest';
import { parseNumberReadings } from '../../src/text/number.ts';

const sorted = (values: readonly number[]): number[] => [...values].sort((a, b) => a - b);

describe('parseNumberReadings', () => {
  it('parseNumberReadings reads plain, grouped and decimal forms', () => {
    expect(parseNumberReadings('1000')).toEqual([1000]);
    expect(parseNumberReadings('1,234.56')).toEqual([1234.56]);
    expect(parseNumberReadings('1.234,56')).toEqual([1234.56]);
    expect(parseNumberReadings('1,234,567')).toEqual([1234567]);
    expect(parseNumberReadings('1.234.567')).toEqual([1234567]);
    expect(parseNumberReadings('1,00,000')).toEqual([100000]);
    expect(parseNumberReadings('3,14')).toEqual([3.14]);
    expect(parseNumberReadings('3.14')).toEqual([3.14]);
    expect(parseNumberReadings('.5')).toEqual([0.5]);
    expect(parseNumberReadings(',5')).toEqual([0.5]);
    expect(parseNumberReadings('1 000')).toEqual([1000]);
    expect(parseNumberReadings("1'000")).toEqual([1000]);
    expect(parseNumberReadings('1\u2019000')).toEqual([1000]);
    expect(parseNumberReadings('1_000')).toEqual([1000]);
    expect(parseNumberReadings('1\u00a0000')).toEqual([1000]);
    expect(parseNumberReadings('\u22125')).toEqual([-5]);
    expect(parseNumberReadings('-5')).toEqual([-5]);
    expect(parseNumberReadings('+5')).toEqual([5]);
    expect(parseNumberReadings('１２')).toEqual([12]);
    expect(parseNumberReadings('  42  ')).toEqual([42]);
    expect(parseNumberReadings('1000.0')).toEqual([1000]);
    expect(parseNumberReadings('007')).toEqual([7]);
  });

  it('parseNumberReadings returns both readings when one separator is ambiguous', () => {
    expect(sorted(parseNumberReadings('1,000'))).toEqual([1, 1000]);
    expect(sorted(parseNumberReadings('1.000'))).toEqual([1, 1000]);
    expect(sorted(parseNumberReadings('12.345'))).toEqual([12.345, 12345]);
    expect(sorted(parseNumberReadings('-1,000'))).toEqual([-1000, -1]);
    expect(sorted(parseNumberReadings('999,999'))).toEqual([999.999, 999999]);
    // Not ambiguous: a group never starts with 0, holds at most three digits, and is followed
    // by exactly three.
    expect(parseNumberReadings('0,500')).toEqual([0.5]);
    expect(parseNumberReadings('1234,567')).toEqual([1234.567]);
    expect(parseNumberReadings('1,0000')).toEqual([1]);
    expect(parseNumberReadings('1,00')).toEqual([1]);
    expect(parseNumberReadings(',500')).toEqual([0.5]);
  });

  it("parseNumberReadings refuses what isn't a plain number", () => {
    const refused = [
      '1e3',
      '1/2',
      '0x10',
      'five',
      'NaN',
      'Infinity',
      '-Infinity',
      '1.2.3,4.5',
      '1,2.3,4',
      '5.',
      '5,',
      '--5',
      '+-5',
      '5-',
      '5 km',
      '.',
      ',',
      '-',
      '+',
      '',
      '   ',
      '٣',
      '½',
    ];

    for (const text of refused) {
      expect(parseNumberReadings(text), JSON.stringify(text)).toEqual([]);
    }
  });

  it('parseNumberReadings returns only finite numbers', () => {
    expect(parseNumberReadings('9'.repeat(400))).toEqual([]);
    expect(parseNumberReadings('9'.repeat(300))).toEqual([Number('9'.repeat(300))]);
  });
});
