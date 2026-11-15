import type { GradingFixture } from '../core/conformance.ts';
import { imageChoiceFixtures } from './image-choice.ts';
import { singleChoiceFixtures } from './single-choice.ts';
import { trueFalseFixtures } from './true-false.ts';

// The fixtures the app and the server both run (spec QT-02): questions, answers and the grade
// each must get. Data only, so they run under any test runner and on a device. A new question
// type adds its file and one entry here.

export const gradingFixtures: readonly GradingFixture[] = [
  ...singleChoiceFixtures,
  ...trueFalseFixtures,
  ...imageChoiceFixtures,
];
