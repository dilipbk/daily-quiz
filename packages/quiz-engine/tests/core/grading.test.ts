import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod';
import { gradeAnswer, toPlayerQuestion } from '../../src/core/grading.ts';
import {
  correct,
  defineQuestionType,
  incorrect,
  invalid,
  unanswered,
} from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';
import type { PlayerQuestionOf, QuestionOf } from '../../src/core/registry.ts';
import { toyRegistry } from '../support/toy-types.ts';
import type { toyFlag, toyWord } from '../support/toy-types.ts';

const context = { locale: 'en', tunables: { toy_word: { ignoreCase: true } } };

const flagQuestion = { type: 'toy_flag', payload: {}, key: { value: true } };
const wordQuestion = {
  type: 'toy_word',
  payload: { hint: 'The capital of France' },
  key: { word: 'paris' },
};

const flag = (value: unknown) => ({ type: 'toy_flag', response: { value } });
const word = (typed: unknown) => ({ type: 'toy_word', response: { word: typed } });

describe('gradeAnswer', () => {
  it('null and undefined answers are unanswered', () => {
    expect(gradeAnswer(toyRegistry, flagQuestion, null, context)).toEqual({
      status: 'unanswered',
      credit: 0,
    });
    expect(gradeAnswer(toyRegistry, flagQuestion, undefined, context)).toEqual(unanswered());
  });

  it('a correct and a wrong response', () => {
    expect(gradeAnswer(toyRegistry, flagQuestion, flag(true), context)).toEqual(correct());
    expect(gradeAnswer(toyRegistry, flagQuestion, flag(false), context)).toEqual(incorrect());
  });

  it('an answer tagged with another registered type is invalid: type_mismatch', () => {
    expect(gradeAnswer(toyRegistry, flagQuestion, word('paris'), context)).toEqual({
      status: 'invalid',
      credit: 0,
      reason: 'type_mismatch',
    });
    // The tag is read before the response: a mismatch stays a mismatch whatever follows it.
    expect(
      gradeAnswer(toyRegistry, flagQuestion, { type: 'toy_word', response: 42 }, context),
    ).toEqual(invalid('type_mismatch'));
    expect(
      gradeAnswer(toyRegistry, flagQuestion, { type: 'hologram', response: {} }, context),
    ).toEqual(invalid('type_mismatch'));
  });

  it('a question of an unregistered type is invalid: unknown_type', () => {
    const hologram = { type: 'hologram', payload: {}, key: {} };

    for (const answer of [flag(true), { type: 'hologram', response: {} }, 'yes', null, undefined]) {
      expect(gradeAnswer(toyRegistry, hologram, answer, context)).toEqual({
        status: 'invalid',
        credit: 0,
        reason: 'unknown_type',
      });
    }
    // A name every object inherits is not a registered type.
    expect(gradeAnswer(toyRegistry, { ...hologram, type: 'constructor' }, null, context)).toEqual(
      invalid('unknown_type'),
    );
  });

  it("a response that fails the module's schema is invalid: malformed", () => {
    const malformed = [
      'yes',
      42,
      true,
      [],
      {},
      { type: 'toy_flag' },
      { response: { value: true } },
      { type: 7, response: { value: true } },
      { type: 'toy_flag', response: null },
      { type: 'toy_flag', response: { value: 'true' } },
      { type: 'toy_flag', response: { value: true, extra: 1 } },
      { type: 'toy_flag', response: { value: true }, elapsedMs: 900 },
    ];

    for (const answer of malformed) {
      expect(
        gradeAnswer(toyRegistry, flagQuestion, answer, context),
        JSON.stringify(answer),
      ).toEqual({ status: 'invalid', credit: 0, reason: 'malformed' });
    }
  });

  it("hands the module its own tunables and the question's locale", () => {
    const caseSensitive = { locale: 'en', tunables: { toy_word: { ignoreCase: false } } };

    expect(gradeAnswer(toyRegistry, wordQuestion, word('PARIS'), context)).toEqual(correct());
    expect(gradeAnswer(toyRegistry, wordQuestion, word('PARIS'), caseSensitive)).toEqual(
      incorrect(),
    );

    const seen: unknown[] = [];
    const empty = z.strictObject({});
    const spy = defineQuestionType({
      type: 'spy',
      timeClass: 'choice',
      payloadSchema: empty,
      keySchema: empty,
      responseSchema: empty,
      tunablesSchema: z.strictObject({ level: z.number() }),
      grade: (_question, _response, gradeContext) => {
        seen.push(gradeContext);
        return correct();
      },
    });
    const plainSpy = defineQuestionType({
      type: 'plain_spy',
      timeClass: 'choice',
      payloadSchema: empty,
      keySchema: empty,
      responseSchema: empty,
      grade: (_question, _response, gradeContext) => {
        seen.push(gradeContext);
        return correct();
      },
    });
    const registry = createRegistry([spy, plainSpy]);
    const spyContext = { locale: 'pt-BR', tunables: { spy: { level: 3 } } };

    for (const type of registry.types) {
      gradeAnswer(registry, { type, payload: {}, key: {} }, { type, response: {} }, spyContext);
    }

    expect(seen).toEqual([
      { locale: 'pt-BR', tunables: { level: 3 } },
      { locale: 'pt-BR', tunables: undefined },
    ]);
  });
});

describe('toPlayerQuestion', () => {
  it('toPlayerQuestion keeps the type and the payload, and leaves the question as it was', () => {
    const before = JSON.stringify(wordQuestion);
    const playerQuestion = toPlayerQuestion(wordQuestion);

    expect(playerQuestion).toEqual({
      type: 'toy_word',
      payload: { hint: 'The capital of France' },
    });
    expect(playerQuestion).not.toHaveProperty('key');
    expect(toyRegistry.playerQuestionSchema.safeParse(playerQuestion).success).toBe(true);
    expect(JSON.stringify(wordQuestion)).toBe(before);
  });

  it('toPlayerQuestion passes on no other field of the object it is given', () => {
    // A stored question carries more than the engine's three fields, and some of it gives the
    // answer away. Nothing is passed on for being unknown.
    const stored = {
      ...flagQuestion,
      id: 'q_1',
      explanation: 'True: the flag has flown there since 1969.',
      answerKey: { value: true },
      rating: 1540,
    };
    const playerQuestion = toPlayerQuestion(stored);

    expect(Object.keys(playerQuestion).sort()).toEqual(['payload', 'type']);
    expect(playerQuestion).toEqual({ type: 'toy_flag', payload: {} });
    expect(toyRegistry.playerQuestionSchema.safeParse(playerQuestion).success).toBe(true);
    expectTypeOf(playerQuestion).not.toHaveProperty('explanation');
    expectTypeOf(playerQuestion).not.toHaveProperty('key');
  });

  it('keeps a union of questions a union', () => {
    type ToyModules = readonly [typeof toyFlag, typeof toyWord];
    const question: QuestionOf<ToyModules> = toyRegistry.questionSchema.parse(wordQuestion);

    expectTypeOf(toPlayerQuestion(question)).toExtend<PlayerQuestionOf<ToyModules>>();
    expectTypeOf(toPlayerQuestion(question)).not.toHaveProperty('key');
  });
});
