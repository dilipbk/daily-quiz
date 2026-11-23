// Reading a typed number without a locale (spec QT-03, numeric tolerance). A German-locale device
// shows a comma on the decimal pad while playing English content, and the engine may not ask
// which locale it is on. So a text is read every way it can be meant, and the grader accepts the
// answer if any reading is close enough.

const CHARACTERS_INSIDE_A_NUMBER = /[\s'\u2019_]/g;

// Anchored at both ends, with one repetition and nothing nested: one pass over the text.
const PLAIN_NUMBER = /^[+-]?(?:\d[\d.,]*\d|\d|[.,]\d+)$/;

const SEPARATOR = /[.,]/g;

/** A lone separator also groups thousands when it splits "1" to "999" from exactly three digits. */
const GROUPED_ONCE = /^[1-9]\d{0,2}[.,]\d{3}$/;

/** `digits` with `decimal` as the decimal point and every other separator dropped. */
const reading = (digits: string, decimal: '.' | ',' | undefined): string =>
  digits.replace(SEPARATOR, (separator) => (separator === decimal ? '.' : ''));

function unsignedReadings(digits: string): readonly string[] {
  const dots = digits.split('.').length - 1;
  const commas = digits.split(',').length - 1;

  if (dots === 0 && commas === 0) return [digits];

  if (dots > 0 && commas > 0) {
    // The separator that comes last is the decimal point, so it appears once.
    const decimal = digits.lastIndexOf('.') > digits.lastIndexOf(',') ? '.' : ',';
    const times = decimal === '.' ? dots : commas;
    return times === 1 ? [reading(digits, decimal)] : [];
  }

  // One kind of separator. Used more than once, it can only be grouping.
  if (dots + commas > 1) return [reading(digits, undefined)];

  const decimal = dots === 1 ? '.' : ',';
  return GROUPED_ONCE.test(digits)
    ? [reading(digits, decimal), reading(digits, undefined)]
    : [reading(digits, decimal)];
}

/**
 * Every number `text` can mean: none, one, or two when a lone separator may be a decimal point
 * or group thousands ("1,000" is 1 and 1000). Words, exponents, fractions and other bases have no
 * reading.
 */
export function parseNumberReadings(text: string): readonly number[] {
  const compact = text
    .normalize('NFKC')
    .trim()
    .replace(/\u2212/g, '-')
    .replace(CHARACTERS_INSIDE_A_NUMBER, '');
  if (!PLAIN_NUMBER.test(compact)) return [];

  const negative = compact.startsWith('-');
  const digits = compact.replace(/^[+-]/, '');

  return unsignedReadings(digits)
    .map((unsigned) => (negative ? -Number(unsigned) : Number(unsigned)))
    .filter((value) => Number.isFinite(value));
}
