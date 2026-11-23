import type { Block } from '@repo/content-blocks';
import { scoreInputSchema } from '@repo/quiz-engine';
import { describe, expect, it } from 'vitest';
import { questionFixtures, questionSetFixture } from '../src/fixtures/questions.ts';
import { unrenderedBlocks } from '../src/published.ts';
import {
  maxSessionQuestions,
  playerQuestionItemSchema,
  questionSetSchema,
  sessionQuestionSchema,
  toPlayerQuestionItem,
} from '../src/questions.ts';
import type { SessionQuestion } from '../src/questions.ts';
import { accepts, withValue, without } from './support.ts';

// A question on the wire: the engine's triple plus what a session needs around it. A snapshot
// carries what both sides score with (ADR 0021), and a keyless view carries no answer (§10.1).

const fixtureNamed = (id: string): SessionQuestion => {
  const found = questionFixtures.find((question) => question.id === id);
  if (found === undefined) throw new Error(`No fixture question has the id ${id}.`);
  return found;
};

const ocean = fixtureNamed('q-largest-ocean');
const algebra = fixtureNamed('q-solve-for-x');

/** The blocks a payload shows, read by shape: options hold content or an image, items hold content. */
const payloadBlocks = (payload: object): Block[] => {
  const entries: readonly { content?: Block[]; image?: Block }[] =
    'options' in payload && Array.isArray(payload.options)
      ? (payload.options as { content?: Block[]; image?: Block }[])
      : 'items' in payload && Array.isArray(payload.items)
        ? (payload.items as { content?: Block[] }[])
        : [];

  return entries.flatMap((entry) => [
    ...(entry.content ?? []),
    ...(entry.image ? [entry.image] : []),
  ]);
};

describe('a session question', () => {
  it('the eight fixture questions parse, and cover the five types and at least five domains', () => {
    for (const question of questionFixtures) {
      expect(sessionQuestionSchema.parse(question), question.id).toEqual(question);
    }

    expect(new Set(questionFixtures.map(({ question }) => question.type))).toEqual(
      new Set(['single_choice', 'true_false', 'image_choice', 'type_answer', 'ordering']),
    );
    expect(new Set(questionFixtures.map(({ domain }) => domain)).size).toBeGreaterThanOrEqual(5);
  });

  it('a session question carries what the engine scores with', () => {
    for (const field of ['locale', 'difficultyMultiplier', 'standardLimitMs']) {
      expect(accepts(sessionQuestionSchema, without(ocean, field)), field).toBe(false);
    }
  });

  it('a multiplier is accepted here exactly when the engine’s score input accepts it', () => {
    const engineAccepts = (difficultyMultiplier: unknown): boolean =>
      accepts(scoreInputSchema, {
        grade: { status: 'correct', credit: 1 },
        difficultyMultiplier,
        timing: { timed: false },
      });

    for (const value of [
      0.8,
      1.5,
      10,
      0.0001,
      0,
      -1,
      10.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '1',
    ]) {
      expect(
        accepts(sessionQuestionSchema, withValue(ocean, 'difficultyMultiplier', value)),
        String(value),
      ).toBe(engineAccepts(value));
    }
  });

  it('a Standard limit is a whole number of milliseconds above zero', () => {
    expect(accepts(sessionQuestionSchema, withValue(ocean, 'standardLimitMs', 20_000))).toBe(true);
    expect(accepts(sessionQuestionSchema, withValue(ocean, 'standardLimitMs', 0))).toBe(false);
    expect(accepts(sessionQuestionSchema, withValue(ocean, 'standardLimitMs', 20_000.5))).toBe(
      false,
    );
  });

  it('a question the engine’s check refuses is refused', () => {
    const keyNamesNoOption = withValue(ocean, 'question', {
      ...ocean.question,
      key: { correctOptionId: 'z' },
    });

    expect(accepts(sessionQuestionSchema, keyNamesNoOption)).toBe(false);
  });

  it('a question without its key is not a session question', () => {
    const keyless = withValue(ocean, 'question', without(ocean.question, 'key'));

    expect(accepts(sessionQuestionSchema, keyless)).toBe(false);
  });

  it('a type this build does not hold is refused, so a new type needs a gate on the server', () => {
    const fromANewerServer = withValue(ocean, 'question', {
      type: 'multi_select',
      payload: {},
      key: {},
    });

    expect(accepts(sessionQuestionSchema, fromANewerServer)).toBe(false);
  });

  it('an explanation cites at least one source, over https', () => {
    const { explanation } = ocean;
    const unsourced = withValue(ocean, 'explanation', { ...explanation, sources: [] });
    const overHttp = withValue(ocean, 'explanation', {
      ...explanation,
      sources: [{ title: 'Pacific Ocean', url: 'http://en.wikipedia.org/wiki/Pacific_Ocean' }],
    });

    expect(accepts(sessionQuestionSchema, unsourced)).toBe(false);
    expect(accepts(sessionQuestionSchema, overHttp)).toBe(false);
  });

  it('every fixture question’s blocks have their renderings', () => {
    for (const { id, prompt, question, renderings, explanation } of questionFixtures) {
      const shownBeforeAnAnswer = [...prompt, ...payloadBlocks(question.payload)];

      expect(unrenderedBlocks(shownBeforeAnAnswer, renderings), id).toEqual([]);
      expect(unrenderedBlocks(explanation.blocks, explanation.renderings), id).toEqual([]);
    }
  });
});

describe('a keyless question', () => {
  it('a keyless item refuses a key, an explanation and sources', () => {
    const view = toPlayerQuestionItem(ocean);

    expect(playerQuestionItemSchema.parse(view)).toEqual(view);
    expect(accepts(playerQuestionItemSchema, ocean)).toBe(false);
    expect(accepts(playerQuestionItemSchema, withValue(view, 'question', ocean.question))).toBe(
      false,
    );
    expect(
      accepts(playerQuestionItemSchema, withValue(view, 'explanation', ocean.explanation)),
    ).toBe(false);
    expect(
      accepts(playerQuestionItemSchema, withValue(view, 'sources', ocean.explanation.sources)),
    ).toBe(false);
    expect(accepts(playerQuestionItemSchema, withValue(view, 'key', ocean.question.key))).toBe(
      false,
    );
  });

  it('toPlayerQuestionItem output parses as a keyless item and holds no explanation rendering', () => {
    for (const question of questionFixtures) {
      const view = toPlayerQuestionItem(question);
      const written = JSON.stringify(view);

      expect(playerQuestionItemSchema.parse(view), question.id).toEqual(view);
      expect(written, question.id).not.toContain('"key"');
      expect(written, question.id).not.toContain('"explanation"');
      expect(view.renderings, question.id).toEqual(question.renderings);
    }

    // The explanation's formula gives the answer away; the prompt's does not.
    const algebraView = JSON.stringify(toPlayerQuestionItem(algebra));
    expect(algebraView).toContain('2x + 6 = 20');
    expect(algebraView).not.toContain('implies');
  });

  it('toPlayerQuestionItem copies named fields, so a field added to a stored question stays behind', () => {
    const withNotes = { ...ocean, editorNotes: 'The answer is c.' };

    expect(toPlayerQuestionItem(withNotes)).toEqual(toPlayerQuestionItem(ocean));
    expect(toPlayerQuestionItem(ocean)).not.toBe(ocean);
  });
});

describe('a question set', () => {
  it('the set fixture parses, with the rules it is scored by', () => {
    expect(questionSetSchema.parse(questionSetFixture)).toEqual(questionSetFixture);
    expect(accepts(questionSetSchema, without(questionSetFixture, 'rules'))).toBe(false);
    expect(
      accepts(
        questionSetSchema,
        withValue(questionSetFixture, 'rules', without(questionSetFixture.rules, 'tunables')),
      ),
    ).toBe(false);
  });

  it('question ids are unique in a set', () => {
    const repeated = withValue(questionSetFixture, 'questions', [ocean, algebra, ocean]);

    expect(accepts(questionSetSchema, repeated)).toBe(false);
  });

  it('a set holds 1 to 50 questions', () => {
    const many = Array.from({ length: maxSessionQuestions + 1 }, (_, index) => ({
      ...ocean,
      id: `q-${String(index)}`,
    }));

    expect(accepts(questionSetSchema, withValue(questionSetFixture, 'questions', []))).toBe(false);
    expect(accepts(questionSetSchema, withValue(questionSetFixture, 'questions', many))).toBe(
      false,
    );
    expect(
      accepts(questionSetSchema, withValue(questionSetFixture, 'questions', many.slice(1))),
    ).toBe(true);
  });
});
