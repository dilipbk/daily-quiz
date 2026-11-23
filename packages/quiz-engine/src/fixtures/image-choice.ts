import type { GradingFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import type { Question } from '../types/index.ts';
import { image } from './content.ts';

// "Which planet has the shortest day?", answered by picking a picture.
const question = {
  type: 'image_choice',
  payload: {
    options: [
      { id: 'a', image: image('planet-earth', 'Earth: a blue planet with white cloud') },
      { id: 'b', image: image('planet-jupiter', 'Jupiter: a banded planet with a red spot') },
      { id: 'c', image: image('planet-mars', 'Mars: a rust-red planet') },
      { id: 'd', image: image('planet-venus', 'Venus: a pale yellow planet covered in cloud') },
    ],
  },
  key: { correctOptionId: 'b' },
} satisfies Question;

const base = { cites: ['QT-02'], question, locale: 'en' };

const pick = (optionId: string) => ({ type: 'image_choice', response: { optionId } });

export const imageChoiceFixtures: readonly GradingFixture[] = [
  { ...base, id: 'image_choice/correct', answer: pick('b'), expected: correct() },
  { ...base, id: 'image_choice/wrong', answer: pick('a'), expected: incorrect() },
  { ...base, id: 'image_choice/unanswered', answer: null, expected: unanswered() },
  {
    ...base,
    id: 'image_choice/unknown-option',
    answer: pick('z'),
    expected: invalid('malformed'),
  },
];
