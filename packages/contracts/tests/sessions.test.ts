import { evaluateSession, mvpRegistry } from '@repo/quiz-engine';
import { describe, expect, it } from 'vitest';
import {
  completeSession,
  completionResultSchema,
  completionSchema,
  createSession,
  createSessionSchema,
  sessionItemsOf,
  sessionSchema,
} from '../src/areas/sessions.ts';
import { globalDailySetFixture } from '../src/fixtures/dailies.ts';
import {
  completedGlobalDailySessionFixture,
  completionFixture,
  completionResultFixture,
  createDaily5Fixture,
  createGlobalDailyFixture,
  createQuizFixture,
  daily5SessionFixture,
  globalDailySessionFixture,
  quizSessionFixture,
} from '../src/fixtures/sessions.ts';
import { accepts, withValue, without } from './support.ts';

// Sessions and their completion (roadmap §4.3, spec §10): the snapshot and the completion carry
// everything the engine needs, so the device and the server reach the same result.

const firstAnswer = completionFixture.answers[0];
if (firstAnswer === undefined) throw new Error('The completion fixture has no answers.');

/** The completion fixture with its first answer changed. */
const withFirstAnswer = (change: object): unknown => ({
  ...completionFixture,
  answers: [{ ...firstAnswer, ...change }, ...completionFixture.answers.slice(1)],
});

describe('POST /sessions', () => {
  it('needs a player session, and takes what to play', () => {
    expect(createSession).toMatchObject({ method: 'POST', path: '/sessions', access: 'player' });

    for (const request of [createGlobalDailyFixture, createDaily5Fixture, createQuizFixture]) {
      expect(createSessionSchema.parse(request)).toEqual(request);
    }
  });

  it('a daily is asked for by date, and a quiz by id and mode', () => {
    expect(accepts(createSessionSchema, { source: 'global_daily' })).toBe(false);
    expect(accepts(createSessionSchema, { source: 'global_daily', date: '2026-02-30' })).toBe(
      false,
    );
    expect(accepts(createSessionSchema, { source: 'quiz', quizId: 'quiz-1' })).toBe(false);
    expect(accepts(createSessionSchema, { source: 'quiz', quizId: 'quiz-1', mode: 'turbo' })).toBe(
      false,
    );
    expect(accepts(createSessionSchema, { ...createGlobalDailyFixture, playerId: 'p2' })).toBe(
      false,
    );
  });

  it('a daily session holds a content version and no questions', () => {
    expect(sessionSchema.parse(globalDailySessionFixture)).toEqual(globalDailySessionFixture);
    expect(globalDailySessionFixture).not.toHaveProperty('set');
    expect(accepts(sessionSchema, without(globalDailySessionFixture, 'contentVersion'))).toBe(
      false,
    );
  });

  it('a Daily 5 session and a quiz session hold their sets', () => {
    expect(sessionSchema.parse(daily5SessionFixture)).toEqual(daily5SessionFixture);
    expect(sessionSchema.parse(quizSessionFixture)).toEqual(quizSessionFixture);
    expect(accepts(sessionSchema, without(daily5SessionFixture, 'set'))).toBe(false);
    expect(accepts(sessionSchema, without(quizSessionFixture, 'set'))).toBe(false);
  });

  it('every session carries server time and when it expires', () => {
    for (const field of ['serverTime', 'expiresAt', 'createdAt']) {
      expect(accepts(sessionSchema, without(globalDailySessionFixture, field)), field).toBe(false);
    }
  });

  it('a completed session has its result, and an open one has none', () => {
    expect(sessionSchema.parse(completedGlobalDailySessionFixture)).toEqual(
      completedGlobalDailySessionFixture,
    );
    expect(
      accepts(sessionSchema, withValue(globalDailySessionFixture, 'status', 'completed')),
    ).toBe(false);
    expect(
      accepts(sessionSchema, withValue(completedGlobalDailySessionFixture, 'status', 'open')),
    ).toBe(false);
  });
});

describe('POST /sessions/:sessionId/complete', () => {
  it('requires an Idempotency-Key and names what it can refuse', () => {
    expect(completeSession).toMatchObject({
      method: 'POST',
      path: '/sessions/:sessionId/complete',
      access: 'player',
      idempotencyKey: true,
    });
    expect(completeSession.errors).toEqual(
      expect.arrayContaining([
        'idempotency_key_required',
        'idempotency_key_reused',
        'request_in_progress',
        'payload_too_large',
        'session_expired',
      ]),
    );
  });

  it('the completion fixture parses', () => {
    expect(completionSchema.parse(completionFixture)).toEqual(completionFixture);
  });

  it('a completion carries the zone id and its offset', () => {
    expect(completionFixture).toMatchObject({ timeZone: 'Asia/Kathmandu', utcOffsetMinutes: 345 });
    expect(accepts(completionSchema, without(completionFixture, 'timeZone'))).toBe(false);
    expect(accepts(completionSchema, without(completionFixture, 'utcOffsetMinutes'))).toBe(false);
    expect(accepts(completionSchema, withValue(completionFixture, 'utcOffsetMinutes', 900))).toBe(
      false,
    );
  });

  it('a zone the server may not know is still a completion: the offset stands in for it', () => {
    const fromANewZone = withValue(completionFixture, 'timeZone', 'America/Coyhaique');

    expect(accepts(completionSchema, fromANewZone)).toBe(true);
  });

  it('a completion carries an engine version and when it ended', () => {
    for (const field of ['engineVersion', 'completedAt', 'startedAt', 'serverOffsetMs']) {
      expect(accepts(completionSchema, without(completionFixture, field)), field).toBe(false);
    }
    expect(accepts(completionSchema, withValue(completionFixture, 'engineVersion', 0))).toBe(false);
    expect(accepts(completionSchema, withValue(completionFixture, 'engineVersion', '1'))).toBe(
      false,
    );
    expect(accepts(completionSchema, withValue(completionFixture, 'serverOffsetMs', null))).toBe(
      true,
    );
    expect(
      accepts(
        completionSchema,
        withValue(completionFixture, 'completedAt', '2026-11-21T17:58:21+05:45'),
      ),
    ).toBe(false);
  });

  it('an answer is a tagged answer or null', () => {
    expect(accepts(completionSchema, withFirstAnswer({ answer: null }))).toBe(true);

    expect(accepts(completionSchema, withFirstAnswer({ answer: 'c' }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ answer: { optionId: 'c' } }))).toBe(false);
    expect(
      accepts(
        completionSchema,
        withFirstAnswer({ answer: { type: 'hotspot', response: { x: 1, y: 2 } } }),
      ),
    ).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ answer: undefined }))).toBe(false);
  });

  it('elapsed time is whole milliseconds, and every answer says whether it was timed', () => {
    expect(accepts(completionSchema, withFirstAnswer({ elapsedMs: 0 }))).toBe(true);

    expect(accepts(completionSchema, withFirstAnswer({ elapsedMs: 12.5 }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ elapsedMs: -1 }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ elapsedMs: Number.NaN }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ elapsedMs: '4200' }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ timed: undefined }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ timed: 'yes' }))).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ pausedMs: 0.5 }))).toBe(false);
  });

  it('a question answered twice is refused, and so are no answers and too many', () => {
    const twice = withValue(completionFixture, 'answers', [firstAnswer, firstAnswer]);
    const tooMany = withValue(
      completionFixture,
      'answers',
      Array.from({ length: 51 }, (_, index) => ({
        ...firstAnswer,
        questionId: `q-${String(index)}`,
      })),
    );

    expect(accepts(completionSchema, twice)).toBe(false);
    expect(accepts(completionSchema, withValue(completionFixture, 'answers', []))).toBe(false);
    expect(accepts(completionSchema, tooMany)).toBe(false);
  });

  it('a completion refuses a field it does not know, such as a score claimed by the device', () => {
    expect(accepts(completionSchema, { ...completionFixture, totalPoints: 9999 })).toBe(false);
    expect(accepts(completionSchema, withFirstAnswer({ correct: true }))).toBe(false);
  });
});

describe('from a snapshot and a completion to the engine', () => {
  // The proof that a snapshot and a completion hold everything both sides score with.
  it('the engine’s evaluation of the completion fixture against the set fixture equals the result fixture', () => {
    const { rules } = globalDailySetFixture;
    const built = sessionItemsOf(globalDailySetFixture, completionFixture);
    if (!built.ok) throw new Error(`The fixtures do not fit: ${built.reason}.`);

    const evaluation = evaluateSession(mvpRegistry, built.items, rules.tunables, rules.scoring);

    expect(evaluation).toEqual(completionResultFixture.evaluation);
    expect(completionResultSchema.parse(completionResultFixture)).toEqual(completionResultFixture);
  });

  it('items come in the order answered, each with the snapshot’s locale, multiplier and limit', () => {
    const reversed = { answers: [...completionFixture.answers].reverse() };
    const built = sessionItemsOf(globalDailySetFixture, reversed);
    if (!built.ok) throw new Error(built.reason);

    expect(built.items).toHaveLength(8);
    expect(built.items[0]).toEqual({
      question: globalDailySetFixture.questions[7]?.question,
      answer: { type: 'single_choice', response: { optionId: 'd' } },
      locale: 'en',
      difficultyMultiplier: 1.5,
      timing: { timed: true, elapsedMs: 5000, standardLimitMs: 20_000 },
    });
  });

  it('an untimed answer becomes { timed: false } and carries no limit', () => {
    const untimed = {
      answers: completionFixture.answers.map((entry) => ({ ...entry, timed: false })),
    };
    const built = sessionItemsOf(globalDailySetFixture, untimed);
    if (!built.ok) throw new Error(built.reason);

    expect(built.items.map((item) => item.timing)).toEqual(
      Array.from({ length: 8 }, () => ({ timed: false })),
    );

    const { rules } = globalDailySetFixture;
    const { score } = evaluateSession(mvpRegistry, built.items, rules.tunables, rules.scoring);
    expect(score.answers.every((answer) => answer.speedBonus === 0)).toBe(true);
  });

  it('sessionItemsOf refuses an id the set does not hold, a set question with no answer, and a repeat', () => {
    const { answers } = completionFixture;

    expect(
      sessionItemsOf(globalDailySetFixture, {
        answers: [...answers.slice(0, 7), { ...firstAnswer, questionId: 'q-from-elsewhere' }],
      }),
    ).toEqual({ ok: false, reason: 'unknown_question', questionId: 'q-from-elsewhere' });

    expect(sessionItemsOf(globalDailySetFixture, { answers: answers.slice(0, 7) })).toEqual({
      ok: false,
      reason: 'missing_question',
      questionId: 'q-symbol-w',
    });

    expect(sessionItemsOf(globalDailySetFixture, { answers: [...answers, firstAnswer] })).toEqual({
      ok: false,
      reason: 'repeated_question',
      questionId: 'q-largest-ocean',
    });
  });
});

describe('the result', () => {
  it('names the credited date, the XP earned, the percentile and the progress that follows', () => {
    for (const field of ['creditedDate', 'evaluation', 'xpEarned', 'percentile', 'progress']) {
      expect(accepts(completionResultSchema, without(completionResultFixture, field)), field).toBe(
        false,
      );
    }
    expect(
      accepts(completionResultSchema, withValue(completionResultFixture, 'percentile', null)),
    ).toBe(true);
    expect(
      accepts(completionResultSchema, withValue(completionResultFixture, 'percentile', 101)),
    ).toBe(false);
  });

  it('carries server time, as every session response does', () => {
    expect(accepts(completionResultSchema, without(completionResultFixture, 'serverTime'))).toBe(
      false,
    );
  });

  it('points are whole and never negative, and a grade keeps the engine’s rules', () => {
    const { evaluation } = completionResultFixture;
    const withScore = (score: object) =>
      withValue(completionResultFixture, 'evaluation', { ...evaluation, score });
    const withGrades = (grades: unknown[]) =>
      withValue(completionResultFixture, 'evaluation', { ...evaluation, grades });

    expect(
      accepts(completionResultSchema, withScore({ ...evaluation.score, totalPoints: 900.5 })),
    ).toBe(false);
    expect(
      accepts(completionResultSchema, withScore({ ...evaluation.score, totalPoints: -1 })),
    ).toBe(false);
    expect(accepts(completionResultSchema, withGrades([{ status: 'correct', credit: 0.5 }]))).toBe(
      false,
    );
  });
});
