import type { GradingFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import type { Question } from '../types/index.ts';

// "Jupiter has the shortest day of any planet in the Solar System." The statement is the prompt,
// and the two labels are app strings, so the payload is empty.
const question = {
  type: 'true_false',
  payload: {},
  key: { value: true },
} satisfies Question;

const base = { cites: ['QT-02'], question, locale: 'en' };

const say = (value: unknown) => ({ type: 'true_false', response: { value } });

export const trueFalseFixtures: readonly GradingFixture[] = [
  { ...base, id: 'true_false/correct', answer: say(true), expected: correct() },
  { ...base, id: 'true_false/wrong', answer: say(false), expected: incorrect() },
  { ...base, id: 'true_false/unanswered', answer: null, expected: unanswered() },
  // A string is not a boolean, whatever it spells.
  { ...base, id: 'true_false/string-true', answer: say('true'), expected: invalid('malformed') },
];
