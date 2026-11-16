import type { ScoringFixture } from '../core/conformance.ts';
import { correct, incorrect, invalid, unanswered } from '../core/module.ts';
import { specScoringConfig } from '../core/scoring.ts';
import type { ScoreInput, ScoreTiming } from '../core/scoring.ts';

// Sessions scored with the spec's values (§10.5, D13): what each answer earns and what the
// session totals. The expected points are written out, not computed, so they hold the engine to
// the spec's arithmetic on every platform that runs them.

const untimed: ScoreTiming = { timed: false };

/** Answered `elapsedMs` into a question whose Standard limit is `standardLimitMs`. */
const after = (elapsedMs: number, standardLimitMs: number): ScoreTiming => ({
  timed: true,
  elapsedMs,
  standardLimitMs,
});

const right = (difficultyMultiplier: number, timing: ScoreTiming): ScoreInput => ({
  grade: correct(),
  difficultyMultiplier,
  timing,
});

const nothing = { base: 0, speedBonus: 0, combo: 0, total: 0, streak: 0 };

const base = { cites: ['§10.5'], config: specScoringConfig };
const lateBase = { ...base, cites: ['§10.5', 'D13'] };

export const scoringFixtures: readonly ScoringFixture[] = [
  // The worked example of DS-01: an easy question, answered with four fifths of its time left.
  {
    ...base,
    id: 'scoring/ds-01-example',
    inputs: [right(0.8, after(4_000, 20_000))],
    expected: {
      answers: [{ base: 80, speedBonus: 32, combo: 0, total: 112, streak: 1 }],
      totalPoints: 112,
      correctCount: 1,
      questionCount: 1,
    },
  },
  // The first correct answer earns no combo; each one after it adds 10, up to 50.
  {
    ...base,
    id: 'scoring/combo-ladder',
    inputs: Array.from({ length: 8 }, () => right(1, untimed)),
    expected: {
      answers: [
        { base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 },
        { base: 100, speedBonus: 0, combo: 10, total: 110, streak: 2 },
        { base: 100, speedBonus: 0, combo: 20, total: 120, streak: 3 },
        { base: 100, speedBonus: 0, combo: 30, total: 130, streak: 4 },
        { base: 100, speedBonus: 0, combo: 40, total: 140, streak: 5 },
        { base: 100, speedBonus: 0, combo: 50, total: 150, streak: 6 },
        { base: 100, speedBonus: 0, combo: 50, total: 150, streak: 7 },
        { base: 100, speedBonus: 0, combo: 50, total: 150, streak: 8 },
      ],
      totalPoints: 1050,
      correctCount: 8,
      questionCount: 8,
    },
  },
  // A wrong answer ends the run, and the next correct answer starts one.
  {
    ...base,
    id: 'scoring/combo-reset',
    inputs: [
      right(1, untimed),
      right(1, untimed),
      { grade: incorrect(), difficultyMultiplier: 1, timing: untimed },
      right(1, untimed),
    ],
    expected: {
      answers: [
        { base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 },
        { base: 100, speedBonus: 0, combo: 10, total: 110, streak: 2 },
        nothing,
        { base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 },
      ],
      totalPoints: 310,
      correctCount: 3,
      questionCount: 4,
    },
  },
  // Extended time (A11Y-08): an answer at 30 s on a 20 s Standard limit keeps its base points.
  {
    ...lateBase,
    id: 'scoring/d13-beyond-standard',
    inputs: [right(1.5, after(30_000, 20_000))],
    expected: {
      answers: [{ base: 150, speedBonus: 0, combo: 0, total: 150, streak: 1 }],
      totalPoints: 150,
      correctCount: 1,
      questionCount: 1,
    },
  },
  {
    ...lateBase,
    id: 'scoring/at-the-limit',
    inputs: [right(1, after(20_000, 20_000))],
    expected: {
      answers: [{ base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 }],
      totalPoints: 100,
      correctCount: 1,
      questionCount: 1,
    },
  },
  // The whole speed bonus: half of the base points again.
  {
    ...base,
    id: 'scoring/instant',
    inputs: [right(1.5, after(0, 20_000))],
    expected: {
      answers: [{ base: 150, speedBonus: 75, combo: 0, total: 225, streak: 1 }],
      totalPoints: 225,
      correctCount: 1,
      questionCount: 1,
    },
  },
  {
    ...base,
    id: 'scoring/untimed',
    inputs: [right(1.5, untimed)],
    expected: {
      answers: [{ base: 150, speedBonus: 0, combo: 0, total: 150, streak: 1 }],
      totalPoints: 150,
      correctCount: 1,
      questionCount: 1,
    },
  },
  // A timeout, then an answer the server couldn't read, sent with most of its time left.
  {
    ...base,
    id: 'scoring/unanswered-and-invalid',
    inputs: [
      { grade: unanswered(), difficultyMultiplier: 1, timing: after(20_000, 20_000) },
      { grade: invalid('malformed'), difficultyMultiplier: 1, timing: after(1_000, 20_000) },
    ],
    expected: {
      answers: [nothing, nothing],
      totalPoints: 0,
      correctCount: 0,
      questionCount: 2,
    },
  },
  // 100 × 1.15 is 114.99999999999999 in binary and rounds to 115; two thirds of the time is left,
  // and the bonus is a share of the rounded base: 115 × 0.5 × 2/3 = 38.33, which rounds to 38.
  {
    ...base,
    id: 'scoring/rounding',
    inputs: [right(1.15, after(10_000, 30_000))],
    expected: {
      answers: [{ base: 115, speedBonus: 38, combo: 0, total: 153, streak: 1 }],
      totalPoints: 153,
      correctCount: 1,
      questionCount: 1,
    },
  },
  // Rounding is Math.round of a binary product, and a product that is a half on paper can sit
  // just under it. 100 × 1.255, the multiplier of rating 1590, is 125.49999999999999: a base of
  // 125 and not 126. With 8,600 ms gone of 20 s, 100 × 0.5 × 0.57 is 28.499999999999996: a bonus
  // of 28 and not 29. Every engine that runs this must agree.
  {
    ...base,
    id: 'scoring/rounding-just-under-half',
    inputs: [right(1.255, untimed), right(1, after(8_600, 20_000))],
    expected: {
      answers: [
        { base: 125, speedBonus: 0, combo: 0, total: 125, streak: 1 },
        { base: 100, speedBonus: 28, combo: 10, total: 138, streak: 2 },
      ],
      totalPoints: 263,
      correctCount: 2,
      questionCount: 2,
    },
  },
];
