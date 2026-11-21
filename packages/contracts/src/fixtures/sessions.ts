import type { Completion, CompletionResult, CreateSession, Session } from '../areas/sessions.ts';
import { globalSetParamsFixture } from './dailies.ts';
import { firstDailyProgressFixture } from './progress.ts';
import { questionFixtures, questionSetFixture } from './questions.ts';

// One player's Global Daily, from start to result: a phone in Kathmandu (UTC+05:45) plays the
// daily of 21 November 2026 in the early evening.

export const createGlobalDailyFixture: CreateSession = {
  source: 'global_daily',
  date: globalSetParamsFixture.date,
};

export const createDaily5Fixture: CreateSession = { source: 'daily_5', date: '2026-11-22' };

export const createQuizFixture: CreateSession = {
  source: 'quiz',
  quizId: 'quiz-periodic-table',
  mode: 'relaxed',
};

export const sessionParamsFixture = { sessionId: 'session-0001' };

/** Open, and pointing at the daily's body. It expires when the date has ended everywhere. */
export const globalDailySessionFixture: Session = {
  id: sessionParamsFixture.sessionId,
  source: 'global_daily',
  mode: 'standard',
  status: 'open',
  date: globalSetParamsFixture.date,
  contentVersion: globalSetParamsFixture.contentVersion,
  createdAt: '2026-11-20T09:31:47.220Z',
  expiresAt: '2026-11-22T12:00:00.000Z',
  serverTime: '2026-11-21T12:09:58.004Z',
  result: null,
};

/**
 * The answers, in the order given: six right, one wrong, one timed out. The sixth was paused for
 * 42 seconds. The device's clock runs 1.84 seconds ahead of the server's.
 */
export const completionFixture: Completion = {
  engineVersion: 1,
  startedAt: '2026-11-21T12:10:04.250Z',
  completedAt: '2026-11-21T12:13:21.900Z',
  serverOffsetMs: -1840,
  timeZone: 'Asia/Kathmandu',
  utcOffsetMinutes: 345,
  answers: [
    {
      questionId: 'q-largest-ocean',
      answer: { type: 'single_choice', response: { optionId: 'c' } },
      elapsedMs: 4200,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-sound-in-water',
      answer: { type: 'true_false', response: { value: true } },
      elapsedMs: 3100,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-which-is-a-mammal',
      answer: { type: 'image_choice', response: { optionId: 'b' } },
      elapsedMs: 6400,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-solve-for-x',
      answer: { type: 'type_answer', response: { text: '7' } },
      elapsedMs: 11_800,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-python-len',
      answer: { type: 'single_choice', response: { optionId: 'c' } },
      elapsedMs: 9000,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-order-the-events',
      answer: { type: 'ordering', response: { order: ['flight', 'war', 'moon', 'wall'] } },
      elapsedMs: 16_250,
      timed: true,
      pausedMs: 42_000,
    },
    {
      questionId: 'q-solitude-author',
      answer: null,
      elapsedMs: 30_000,
      timed: true,
      pausedMs: 0,
    },
    {
      questionId: 'q-symbol-w',
      answer: { type: 'single_choice', response: { optionId: 'd' } },
      elapsedMs: 5000,
      timed: true,
      pausedMs: 0,
    },
  ],
};

/**
 * What the server answers. The evaluation is what the engine makes of `completionFixture` against
 * the daily's set, and a test holds the two together. The first answer is DS-01's worked example:
 * 80 base and 32 for speed. XP is 10 for the session and 2 for each of six correct answers.
 */
export const completionResultFixture: CompletionResult = {
  sessionId: sessionParamsFixture.sessionId,
  serverTime: '2026-11-21T12:13:23.371Z',
  creditedDate: '2026-11-21',
  evaluation: {
    grades: [
      { status: 'correct', credit: 1 },
      { status: 'correct', credit: 1 },
      { status: 'correct', credit: 1 },
      { status: 'correct', credit: 1 },
      { status: 'incorrect', credit: 0 },
      { status: 'correct', credit: 1 },
      { status: 'unanswered', credit: 0 },
      { status: 'correct', credit: 1 },
    ],
    score: {
      answers: [
        { base: 80, speedBonus: 32, combo: 0, total: 112, streak: 1 },
        { base: 80, speedBonus: 34, combo: 10, total: 124, streak: 2 },
        { base: 80, speedBonus: 31, combo: 20, total: 131, streak: 3 },
        { base: 115, speedBonus: 41, combo: 30, total: 186, streak: 4 },
        { base: 0, speedBonus: 0, combo: 0, total: 0, streak: 0 },
        { base: 115, speedBonus: 26, combo: 0, total: 141, streak: 1 },
        { base: 0, speedBonus: 0, combo: 0, total: 0, streak: 0 },
        { base: 150, speedBonus: 56, combo: 0, total: 206, streak: 1 },
      ],
      totalPoints: 900,
      correctCount: 6,
      questionCount: 8,
    },
  },
  xpEarned: 22,
  percentile: 71,
  progress: firstDailyProgressFixture,
};

/** The same session once completed, as a second device would get it. */
export const completedGlobalDailySessionFixture: Session = {
  ...globalDailySessionFixture,
  status: 'completed',
  serverTime: '2026-11-21T12:20:40.118Z',
  result: completionResultFixture,
};

/** A Daily 5 prefetched for tomorrow: five questions, carried in the session. */
export const daily5SessionFixture: Session = {
  id: 'session-0002',
  source: 'daily_5',
  mode: 'standard',
  status: 'open',
  date: '2026-11-22',
  createdAt: '2026-11-21T12:21:03.640Z',
  expiresAt: '2026-11-23T12:00:00.000Z',
  serverTime: '2026-11-21T12:21:03.640Z',
  result: null,
  set: { rules: questionSetFixture.rules, questions: questionFixtures.slice(0, 5) },
};

/** A quiz played in Relaxed mode: untimed, so no answer earns a speed bonus. */
export const quizSessionFixture: Session = {
  id: 'session-0003',
  source: 'quiz',
  mode: 'relaxed',
  status: 'open',
  quizId: 'quiz-periodic-table',
  quizVersion: 4,
  createdAt: '2026-11-21T12:25:11.092Z',
  expiresAt: '2026-11-28T12:25:11.092Z',
  serverTime: '2026-11-21T12:25:11.092Z',
  result: null,
  set: { rules: questionSetFixture.rules, questions: questionFixtures.slice(6) },
};
