import { describe, expect, it } from 'vitest';
import {
  domainsSchema,
  getDomains,
  getQuiz,
  listQuizzes,
  quizPageSchema,
  quizSchema,
  quizzesQuerySchema,
} from '../src/areas/content.ts';
import {
  domainsFixture,
  emptyQuizPageFixture,
  lastQuizPageFixture,
  quizFixture,
  quizPageFixture,
  quizzesQueryFixture,
} from '../src/fixtures/content.ts';
import { accepts, withValue } from './support.ts';

// The catalogue (spec §19.3). Lists use cursor pagination: `cursor`, `limit`, `nextCursor` (§19.2).

describe('GET /domains', () => {
  it('is public and cached by ETag', () => {
    expect(getDomains).toMatchObject({ path: '/domains', access: 'public', caching: 'etag' });
  });

  it('the eleven launch domains parse', () => {
    expect(domainsSchema.parse(domainsFixture)).toEqual(domainsFixture);
    expect(domainsFixture.domains).toHaveLength(11);
    expect(new Set(domainsFixture.domains.map(({ slug }) => slug)).size).toBe(11);
  });
});

describe('GET /quizzes', () => {
  it('takes a cursor and a limit, and answers with items and the next cursor', () => {
    expect(listQuizzes.query).toBe(quizzesQuerySchema);
    expect(Object.keys(quizzesQuerySchema.shape).sort()).toEqual([
      'cursor',
      'domain',
      'limit',
      'topic',
    ]);
    expect(quizPageSchema.parse(quizPageFixture)).toEqual(quizPageFixture);
    expect(quizPageSchema.parse(lastQuizPageFixture)).toEqual(lastQuizPageFixture);
  });

  it('limit is read from a query string and capped at 50', () => {
    expect(quizzesQuerySchema.parse({ domain: 'science', limit: '20' })).toEqual(
      quizzesQueryFixture,
    );
    expect(quizzesQuerySchema.parse({})).toEqual({});
    for (const limit of ['51', '0', 'abc']) {
      expect(accepts(quizzesQuerySchema, { limit }), limit).toBe(false);
    }
  });

  it('a query refuses a filter it does not know', () => {
    expect(accepts(quizzesQuerySchema, { difficulty: 'hard' })).toBe(false);
    expect(accepts(quizzesQuerySchema, { domain: 'Science' })).toBe(false);
  });

  it('a page with no items and no cursor parses', () => {
    expect(quizPageSchema.parse(emptyQuizPageFixture)).toEqual(emptyQuizPageFixture);
  });

  it('a page holds 50 quizzes at most', () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => ({
      ...quizFixture,
      id: `quiz-${String(index)}`,
    }));

    expect(accepts(quizPageSchema, { items: tooMany, nextCursor: null })).toBe(false);
  });
});

describe('a quiz', () => {
  it('the quiz fixture parses, and a quiz may have no cover, description or topic', () => {
    expect(quizSchema.parse(quizFixture)).toEqual(quizFixture);
    expect(
      accepts(quizSchema, { ...quizFixture, cover: null, description: null, topic: null }),
    ).toBe(true);
    expect(getQuiz).toMatchObject({ path: '/quizzes/:quizId', access: 'public' });
    expect(getQuiz.errors).toEqual(['not_found']);
  });

  it('a quiz may list a question type this build does not know', () => {
    const withANewType = withValue(quizFixture, 'questionTypes', ['single_choice', 'multi_select']);

    expect(accepts(quizSchema, withANewType)).toBe(true);
  });

  it('a quiz has at least one question and a difficulty of easy, medium or hard', () => {
    expect(accepts(quizSchema, withValue(quizFixture, 'questionCount', 0))).toBe(false);
    expect(accepts(quizSchema, withValue(quizFixture, 'difficulty', 'brutal'))).toBe(false);
  });
});
