import { localDateOf } from '@repo/game-rules';
import { runSharedFixtures } from '@repo/quiz-engine/fixtures';
import { z } from 'zod';

// Language features the shared packages (content-blocks, quiz-engine) rely on. Their tests
// run on V8, the app runs on Hermes, so each feature is evaluated here on the device.
// The regular expressions are literals on purpose: that is how the packages write them.

const unicodeClasses: readonly (readonly [name: string, pattern: RegExp, sample: string])[] = [
  ['L', /^\p{L}+$/u, 'héllo'],
  ['M', /\p{M}/u, 'é'],
  ['Z', /\p{Z}/u, ' '],
  ['Cc', /\p{Cc}/u, '\u0007'],
  ['Cf', /\p{Cf}/u, '​'],
  ['Cs', /\p{Cs}/u, '\uD800'],
];

export function probeUnicodeRegex(): string {
  const wrong = unicodeClasses.filter(
    ([, pattern, sample]) => !pattern.test(sample) || pattern.test('1'),
  );
  if (wrong.length > 0) {
    throw new Error(`wrong result for \\p{${wrong.map(([name]) => name).join('}, \\p{')}}`);
  }
  return unicodeClasses.map(([name]) => `\\p{${name}}`).join(' ');
}

export function probeObjectHasOwn(): string {
  const own = Object.hasOwn({ answer: 1 }, 'answer');
  const inherited = Object.hasOwn({}, 'toString');
  if (!own || inherited) throw new Error(`own=${String(own)} inherited=${String(inherited)}`);
  return 'own key true, inherited key false';
}

export function probeArrayAt(): string {
  const last = ['a', 'b', 'c'].at(-1);
  if (last !== 'c') throw new Error(`at(-1) returned ${String(last)}`);
  return "at(-1) is 'c'";
}

export function probeNormalize(): string {
  const { length } = 'é'.normalize('NFD');
  if (length !== 2) throw new Error(`'é'.normalize('NFD').length is ${String(length)}`);
  return "'é' in NFD has length 2";
}

export function probeZod(): string {
  const choice = z.strictObject({ type: z.literal('choice'), options: z.array(z.string()).min(2) });
  const numeric = z.strictObject({ type: z.literal('numeric'), answer: z.number() });
  const question = z.discriminatedUnion('type', [choice, numeric]);

  const valid = question.safeParse({ type: 'numeric', answer: 42 });
  const unknownKey = question.safeParse({ type: 'numeric', answer: 42, extra: true });
  const unknownType = question.safeParse({ type: 'essay' });

  if (!valid.success || unknownKey.success || unknownType.success) {
    throw new Error(
      `valid=${String(valid.success)} unknownKey=${String(unknownKey.success)} unknownType=${String(unknownType.success)}`,
    );
  }
  return 'strictObject and discriminatedUnion accept valid, reject invalid';
}

const localDate = (timeZone: string, instant: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

/** The local-day arithmetic game-rules depends on (ENG-03): the actual strings are always shown. */
export function probeDateTimeFormat(): string {
  const kathmandu = localDate('Asia/Kathmandu', new Date(Date.UTC(2026, 0, 1, 18, 30)));
  const losAngeles = localDate('America/Los_Angeles', new Date(Date.UTC(2026, 0, 1, 7, 59)));
  const actual = `Kathmandu ${kathmandu}, Los Angeles ${losAngeles}`;
  if (kathmandu !== '01/02/2026' || losAngeles !== '12/31/2025') {
    throw new Error(`${actual}; expected 01/02/2026 and 12/31/2025`);
  }
  return actual;
}

const utc = (year: number, month: number, day: number, hour: number, minute: number): number =>
  Date.UTC(year, month - 1, day, hour, minute);

// What game-rules needs from the runtime's Intl (ADR 0005), through its own `localDateOf`:
// a 45-minute offset, the +14:00 zone, and the minute on each side of local midnight on the
// days Los Angeles changes its clocks in 2026. Expected values are what Node 26.13.1 gives.
const localDateCases: readonly (readonly [zone: string, instant: number, expected: string])[] = [
  ['Asia/Kathmandu', utc(2026, 1, 1, 18, 30), '2026-01-02'],
  ['Pacific/Kiritimati', utc(2026, 6, 15, 10, 30), '2026-06-16'],
  ['America/Los_Angeles', utc(2026, 3, 8, 7, 59), '2026-03-07'],
  ['America/Los_Angeles', utc(2026, 3, 8, 8, 0), '2026-03-08'],
  ['America/Los_Angeles', utc(2026, 3, 9, 6, 59), '2026-03-08'],
  ['America/Los_Angeles', utc(2026, 3, 9, 7, 0), '2026-03-09'],
  ['America/Los_Angeles', utc(2026, 11, 1, 6, 59), '2026-10-31'],
  ['America/Los_Angeles', utc(2026, 11, 1, 7, 0), '2026-11-01'],
  ['America/Los_Angeles', utc(2026, 11, 2, 7, 59), '2026-11-01'],
  ['America/Los_Angeles', utc(2026, 11, 2, 8, 0), '2026-11-02'],
];

const thrownName = (act: () => unknown): string => {
  try {
    return `returned ${String(act())}`;
  } catch (thrown) {
    return thrown instanceof Error ? thrown.name : typeof thrown;
  }
};

export function probeLocalDates(): string {
  const actual = localDateCases.map(([zone, instant]) =>
    thrownName(() => localDateOf(instant, zone)).replace(/^returned /, ''),
  );
  const unknownZone = thrownName(() => localDateOf(utc(2026, 1, 1, 0, 0), 'Mars/Olympus_Mons'));
  const emptyZone = thrownName(() => localDateOf(utc(2026, 1, 1, 0, 0), ''));
  const report = `${actual.join(' ')}; unknown zone: ${unknownZone}; empty zone: ${emptyZone}`;

  const wrong = localDateCases.filter(([, , expected], index) => actual[index] !== expected);
  if (wrong.length > 0 || unknownZone !== 'RangeError' || emptyZone !== 'RangeError') {
    const expected = localDateCases.map(([, , date]) => date).join(' ');
    throw new Error(`${report}; expected ${expected} and RangeError twice`);
  }
  return report;
}

/** Every fixture the app and the server share (QT-02), graded and scored by the engine itself. */
export function probeSharedFixtures(): string {
  const { ran, failures } = runSharedFixtures();

  if (failures.length > 0) {
    const listed = failures
      .map(
        ({ id, expected, actual }) =>
          `${id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      )
      .join('; ');
    throw new Error(`${String(failures.length)} of ${String(ran)} fixtures failed. ${listed}`);
  }
  return `${String(ran)} fixtures ran, 0 failed`;
}
