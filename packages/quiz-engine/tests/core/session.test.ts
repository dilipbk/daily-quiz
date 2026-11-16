import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { correct, defineQuestionType, invalid, unanswered } from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';
import { scoreSession, specScoringConfig } from '../../src/core/scoring.ts';
import { evaluateSession } from '../../src/core/session.ts';
import type { SessionItem } from '../../src/core/session.ts';
import { toyRegistry } from '../support/toy-types.ts';

const tunables = { toy_word: { ignoreCase: true } };

const flagItem = (answer: unknown): SessionItem => ({
  question: { type: 'toy_flag', payload: {}, key: { value: true } },
  answer,
  locale: 'en',
  difficultyMultiplier: 1,
  timing: { timed: false },
});

const yes = { type: 'toy_flag', response: { value: true } };

describe('evaluateSession', () => {
  it('evaluateSession grades then scores, in order', () => {
    const { grades, score } = evaluateSession(
      toyRegistry,
      [flagItem(yes), flagItem(null), flagItem(yes)],
      tunables,
      specScoringConfig,
    );

    expect(grades).toEqual([correct(), unanswered(), correct()]);
    expect(score).toMatchObject({ totalPoints: 200, correctCount: 2, questionCount: 3 });
    // The timeout between them broke the streak, so the second correct answer earns no combo.
    expect(score.answers.map((answer) => answer.combo)).toEqual([0, 0, 0]);
    expect(score.answers.map((answer) => answer.streak)).toEqual([1, 0, 1]);
  });

  it('scores each item on its own multiplier and timing', () => {
    const wordItem: SessionItem = {
      question: {
        type: 'toy_word',
        payload: { hint: 'The capital of France' },
        key: { word: 'paris' },
      },
      answer: { type: 'toy_word', response: { word: 'PARIS' } },
      locale: 'fr',
      difficultyMultiplier: 1.5,
      timing: { timed: true, elapsedMs: 0, standardLimitMs: 30_000 },
    };

    const { grades, score } = evaluateSession(
      toyRegistry,
      [flagItem(yes), wordItem],
      tunables,
      specScoringConfig,
    );

    expect(grades).toEqual([correct(), correct()]);
    expect(score.answers).toEqual([
      { base: 100, speedBonus: 0, combo: 0, total: 100, streak: 1 },
      { base: 150, speedBonus: 75, combo: 10, total: 235, streak: 2 },
    ]);
    expect(score.totalPoints).toBe(335);
  });

  it("grades each item in its own locale, with the session's tunables", () => {
    const seen: unknown[] = [];
    const empty = z.strictObject({});
    const spy = defineQuestionType({
      type: 'spy',
      timeClass: 'choice',
      payloadSchema: empty,
      keySchema: empty,
      responseSchema: empty,
      tunablesSchema: z.strictObject({ level: z.number() }),
      grade: (_question, _response, context) => {
        seen.push(context);
        return correct();
      },
    });
    const spyItem = (locale: string): SessionItem => ({
      question: { type: 'spy', payload: {}, key: {} },
      answer: { type: 'spy', response: {} },
      locale,
      difficultyMultiplier: 1,
      timing: { timed: false },
    });

    evaluateSession(
      createRegistry([spy]),
      [spyItem('en'), spyItem('pt-BR')],
      { spy: { level: 3 } },
      specScoringConfig,
    );

    expect(seen).toEqual([
      { locale: 'en', tunables: { level: 3 } },
      { locale: 'pt-BR', tunables: { level: 3 } },
    ]);
  });

  it("an item the registry can't grade scores nothing and doesn't stop the session", () => {
    const hologram: SessionItem = {
      ...flagItem(yes),
      question: { type: 'hologram', payload: {}, key: {} },
    };

    const { grades, score } = evaluateSession(
      toyRegistry,
      [flagItem(yes), hologram, flagItem('yes'), flagItem(yes)],
      tunables,
      specScoringConfig,
    );

    expect(grades).toEqual([correct(), invalid('unknown_type'), invalid('malformed'), correct()]);
    expect(score).toMatchObject({ totalPoints: 200, correctCount: 2, questionCount: 4 });
  });

  it('evaluateSession of no items', () => {
    expect(evaluateSession(toyRegistry, [], tunables, specScoringConfig)).toEqual({
      grades: [],
      score: { answers: [], totalPoints: 0, correctCount: 0, questionCount: 0 },
    });
  });
});

describe('scoreSession', () => {
  it('scoreSession of no answers', () => {
    expect(scoreSession([], specScoringConfig)).toEqual({
      answers: [],
      totalPoints: 0,
      correctCount: 0,
      questionCount: 0,
    });
  });
});
