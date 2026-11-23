import { runGradingFixtures, runScoringFixtures } from '../core/conformance.ts';
import type { FixtureReport, GradingFixture } from '../core/conformance.ts';
import { mvpRegistry, specMvpTunables } from '../types/index.ts';
import { imageChoiceFixtures } from './image-choice.ts';
import { orderingFixtures } from './ordering.ts';
import { scoringFixtures } from './scoring.ts';
import { singleChoiceFixtures } from './single-choice.ts';
import { trueFalseFixtures } from './true-false.ts';
import { typeAnswerFixtures } from './type-answer.ts';

// The fixtures the app and the server both run (spec QT-02): questions, answers and the grade
// each must get, and sessions with the points each must score. Data only, so they run under any
// test runner and on a device. A new question type adds its file and one entry here.

export const gradingFixtures: readonly GradingFixture[] = [
  ...singleChoiceFixtures,
  ...trueFalseFixtures,
  ...imageChoiceFixtures,
  ...typeAnswerFixtures,
  ...orderingFixtures,
];

export { scoringFixtures };

/**
 * Runs every shared fixture against the MVP registry with the spec's values. It needs no test
 * runner: a test asserts that `failures` is empty, and a device can show the report.
 */
export function runSharedFixtures(): FixtureReport {
  const grading = runGradingFixtures(mvpRegistry, gradingFixtures, specMvpTunables);
  const scoring = runScoringFixtures(scoringFixtures);

  return { ran: grading.ran + scoring.ran, failures: [...grading.failures, ...scoring.failures] };
}
