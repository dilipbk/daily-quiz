import type { GradingFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import type { Question } from '../types/index.ts';
import { text } from './content.ts';

// "Order these planets from nearest to the Sun." The items are stored in an order that says
// nothing about the answer.
const question = {
  type: 'ordering',
  payload: {
    items: [
      { id: 'mars', content: text('Mars') },
      { id: 'mercury', content: text('Mercury') },
      { id: 'earth', content: text('Earth') },
      { id: 'venus', content: text('Venus') },
    ],
  },
  key: { order: ['mercury', 'venus', 'earth', 'mars'] },
} satisfies Question;

const base = { cites: ['QT-02'], question, locale: 'en' };

const arrange = (...order: string[]) => ({ type: 'ordering', response: { order } });

export const orderingFixtures: readonly GradingFixture[] = [
  {
    ...base,
    id: 'ordering/correct',
    answer: arrange('mercury', 'venus', 'earth', 'mars'),
    expected: correct(),
  },
  // Two of four in place earns nothing: an order is right or it isn't.
  {
    ...base,
    id: 'ordering/partly-right',
    answer: arrange('mercury', 'venus', 'mars', 'earth'),
    expected: incorrect(),
  },
  {
    ...base,
    id: 'ordering/reversed',
    answer: arrange('mars', 'earth', 'venus', 'mercury'),
    expected: incorrect(),
  },
  // Submitted as it was shown, in the stored order.
  {
    ...base,
    id: 'ordering/untouched',
    answer: arrange('mars', 'mercury', 'earth', 'venus'),
    expected: incorrect(),
  },
  // An order that isn't an arrangement of this question's items was never built on the device.
  {
    ...base,
    id: 'ordering/missing-item',
    answer: arrange('mercury', 'venus', 'earth'),
    expected: invalid('malformed'),
  },
  {
    ...base,
    id: 'ordering/repeated-item',
    answer: arrange('mercury', 'mercury', 'earth', 'mars'),
    expected: invalid('malformed'),
  },
  {
    ...base,
    id: 'ordering/unknown-item',
    answer: arrange('mercury', 'venus', 'earth', 'pluto'),
    expected: invalid('malformed'),
  },
  { ...base, id: 'ordering/unanswered', answer: null, expected: unanswered() },
];
