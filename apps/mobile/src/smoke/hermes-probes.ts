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

export async function probeZod(): Promise<string> {
  const { z } = await import('zod');

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
