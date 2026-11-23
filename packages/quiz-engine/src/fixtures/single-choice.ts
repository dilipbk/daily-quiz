import type { GradingFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import type { Question } from '../types/index.ts';
import { text } from './content.ts';

// "Which planet has the shortest day?" The prompt belongs to the rest of the Question entity; the
// engine's question is the triple below.
const question = {
  type: 'single_choice',
  payload: {
    options: [
      { id: 'a', content: text('Earth') },
      { id: 'b', content: text('Jupiter') },
      { id: 'c', content: text('Mars') },
      { id: 'd', content: text('Venus') },
    ],
  },
  key: { correctOptionId: 'b' },
} satisfies Question;

const base = { cites: ['QT-02'], question, locale: 'en' };

const pick = (optionId: string) => ({ type: 'single_choice', response: { optionId } });

export const singleChoiceFixtures: readonly GradingFixture[] = [
  { ...base, id: 'single_choice/correct', answer: pick('b'), expected: correct() },
  { ...base, id: 'single_choice/wrong', answer: pick('a'), expected: incorrect() },
  { ...base, id: 'single_choice/unanswered', answer: null, expected: unanswered() },
  // An id the question doesn't offer was never a choice: the device didn't send this.
  {
    ...base,
    id: 'single_choice/unknown-option',
    answer: pick('z'),
    expected: invalid('malformed'),
  },
  {
    ...base,
    id: 'single_choice/wrong-type',
    answer: { type: 'true_false', response: { value: true } },
    expected: invalid('type_mismatch'),
  },
  { ...base, id: 'single_choice/bare-string', answer: 'b', expected: invalid('malformed') },
  {
    ...base,
    id: 'single_choice/extra-key',
    answer: { type: 'single_choice', response: { optionId: 'b', correct: true } },
    expected: invalid('malformed'),
  },
];
