import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as z from 'zod';
import { gradingFixtures } from '../src/fixtures/index.ts';
import {
  correct,
  createRegistry,
  evaluateSession,
  gradeAnswer,
  incorrect,
  invalid,
  mvpQuestionTypes,
  runGradingFixtures,
  specMvpTunables,
  specScoringConfig,
  toPlayerQuestion,
  unanswered,
} from '../src/index.ts';
import type { GradingFixture, QuestionOf, QuestionType, SessionItem } from '../src/index.ts';
import { mvpKits } from './support/arbitraries.ts';
import { multiSelect, multiSelectKit, text } from './support/multi-select.ts';
import { describeRegistryProperties } from './support/registry-properties.ts';

// The ticket's second done-when clause: a sixth type would touch no engine code. `multi_select`
// lives in tests/support and reaches the engine through its public API only; everything below
// works with src/core, src/text and src/index.ts as they are.

const sixTypes = [...mvpQuestionTypes, multiSelect] as const;
const registry = createRegistry(sixTypes);

const context = { locale: 'en', tunables: specMvpTunables };

// "Which of these are noble gases?"
const question = {
  type: 'multi_select',
  payload: {
    options: [
      { id: 'a', content: text('Argon') },
      { id: 'b', content: text('Neon') },
      { id: 'c', content: text('Nitrogen') },
      { id: 'd', content: text('Oxygen') },
    ],
  },
  key: { correctOptionIds: ['a', 'b'] },
} satisfies QuestionOf<typeof sixTypes>;

const select = (...optionIds: string[]) => ({ type: 'multi_select', response: { optionIds } });

const issuePaths = (candidate: unknown): PropertyKey[][] => {
  const result = registry.questionSchema.safeParse(candidate);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
};

describe('a sixth type validates, grades, scores and passes the generic properties with src/core unchanged', () => {
  it('is registered after the five, and the question union gains its type', () => {
    expect(registry.types).toEqual([
      ...mvpQuestionTypes.map((module) => module.type),
      'multi_select',
    ]);
    expect(registry.types).toHaveLength(6);
    expect(registry.get('multi_select')).toBe(multiSelect);

    expectTypeOf<z.infer<typeof registry.questionSchema>['type']>().toEqualTypeOf<
      QuestionType | 'multi_select'
    >();
  });

  it('its questions are validated by the schemas the registry derives', () => {
    expect(issuePaths(question)).toEqual([]);
    // The module's own rule across fields runs: the key names an option that doesn't exist.
    expect(issuePaths({ ...question, key: { correctOptionIds: ['a', 'z'] } })).toEqual([
      ['key', 'correctOptionIds'],
    ]);

    expect(registry.playerQuestionSchema.safeParse(question).success).toBe(false);
    expect(registry.playerQuestionSchema.safeParse(toPlayerQuestion(question)).success).toBe(true);
  });

  it('its answers are graded through the registry', () => {
    const grade = (answer: unknown) => gradeAnswer(registry, question, answer, context);

    expect(grade(select('b', 'a'))).toEqual(correct());
    expect(grade(select('a'))).toEqual(incorrect());
    expect(grade(select('a', 'b', 'c'))).toEqual(incorrect());
    expect(grade(select())).toEqual(incorrect());
    expect(grade(null)).toEqual(unanswered());
    expect(grade(select('a', 'a'))).toEqual(invalid('malformed'));
    expect(grade(select('a', 'z'))).toEqual(invalid('malformed'));
    expect(grade({ type: 'single_choice', response: { optionId: 'a' } })).toEqual(
      invalid('type_mismatch'),
    );
  });

  it('it is scored beside the five: two correct answers, the second of its type, total 210', () => {
    const [singleChoice] = gradingFixtures.filter(
      (fixture) => fixture.id === 'single_choice/correct',
    );
    if (singleChoice === undefined) throw new Error('The single_choice/correct fixture is gone.');

    const item = (asked: SessionItem['question'], answer: unknown): SessionItem => ({
      question: asked,
      answer,
      locale: 'en',
      difficultyMultiplier: 1,
      timing: { timed: false },
    });
    const { grades, score } = evaluateSession(
      registry,
      [item(singleChoice.question, singleChoice.answer), item(question, select('a', 'b'))],
      specMvpTunables,
      specScoringConfig,
    );

    expect(grades).toEqual([correct(), correct()]);
    // 100 and 100, and the second consecutive correct answer earns a combo of 10.
    expect(score.answers.map((answer) => answer.total)).toEqual([100, 110]);
    expect(score.totalPoints).toBe(210);
  });

  it('its fixtures run through the shared runner, and the shared fixtures still pass beside it', () => {
    const base = { cites: ['QT-01'], question, locale: 'en' };
    const fixtures: GradingFixture[] = [
      { ...base, id: 'multi_select/correct', answer: select('a', 'b'), expected: correct() },
      { ...base, id: 'multi_select/one-missing', answer: select('a'), expected: incorrect() },
      {
        ...base,
        id: 'multi_select/unknown-option',
        answer: select('a', 'z'),
        expected: invalid('malformed'),
      },
    ];

    expect(runGradingFixtures(registry, fixtures, specMvpTunables)).toEqual({
      ran: 3,
      failures: [],
    });
    expect(runGradingFixtures(registry, gradingFixtures, specMvpTunables)).toEqual({
      ran: gradingFixtures.length,
      failures: [],
    });
  });

  describeRegistryProperties(
    'six-type registry',
    registry,
    [...mvpKits, multiSelectKit],
    specMvpTunables,
    fc.constantFrom('en', 'en-GB', 'es', 'pt-BR', 'hi'),
  );
});
