import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod';
import {
  correct,
  defineQuestionType,
  gradeSchema,
  incorrect,
  invalid,
  unanswered,
} from '../../src/core/module.ts';
import { createRegistry } from '../../src/core/registry.ts';
import type {
  AnswerOf,
  PlayerQuestionOf,
  QuestionOf,
  TunablesOf,
} from '../../src/core/registry.ts';
import { toyFlag, toyRegistry, toyWord } from '../support/toy-types.ts';

const flagQuestion = { type: 'toy_flag', payload: {}, key: { value: true } };
const wordQuestion = {
  type: 'toy_word',
  payload: { hint: 'The capital of France' },
  key: { word: 'Paris' },
};

describe('createRegistry', () => {
  it('QT-01: builds question, player-question and answer schemas from the modules alone', () => {
    const answer = { type: 'toy_flag', response: { value: true } };

    expect(toyRegistry.types).toEqual(['toy_flag', 'toy_word']);
    expect(toyRegistry.questionSchema.parse(flagQuestion)).toEqual(flagQuestion);
    expect(toyRegistry.questionSchema.parse(wordQuestion)).toEqual(wordQuestion);
    expect(toyRegistry.answerSchema.parse(answer)).toEqual(answer);
  });

  it('QT-01: derives the question, answer and tunables types from the modules', () => {
    type ToyModules = readonly [typeof toyFlag, typeof toyWord];
    type WordOf<Union> = Extract<Union, { type: 'toy_word' }>;

    expectTypeOf(toyRegistry.types).toEqualTypeOf<readonly ('toy_flag' | 'toy_word')[]>();
    expectTypeOf<QuestionOf<ToyModules>['type']>().toEqualTypeOf<'toy_flag' | 'toy_word'>();
    expectTypeOf<WordOf<QuestionOf<ToyModules>>['payload']>().toEqualTypeOf<{ hint: string }>();
    expectTypeOf<WordOf<QuestionOf<ToyModules>>['key']>().toEqualTypeOf<{ word: string }>();
    expectTypeOf<WordOf<PlayerQuestionOf<ToyModules>>>().not.toHaveProperty('key');
    expectTypeOf<WordOf<AnswerOf<ToyModules>>['response']>().toEqualTypeOf<{ word: string }>();
    expectTypeOf<TunablesOf<ToyModules>>().toEqualTypeOf<{
      readonly toy_word: { ignoreCase: boolean };
    }>();
    expectTypeOf(toyRegistry.questionSchema.parse(wordQuestion)).toEqualTypeOf<
      QuestionOf<ToyModules>
    >();
  });

  it('the question schema is strict', () => {
    const { questionSchema } = toyRegistry;

    expect(questionSchema.safeParse({ ...flagQuestion, rating: 1500 }).success).toBe(false);
    expect(questionSchema.safeParse({ ...flagQuestion, payload: { hint: '' } }).success).toBe(
      false,
    );
    expect(questionSchema.safeParse({ ...flagQuestion, type: 'hologram' }).success).toBe(false);
  });

  it('the answer schema is strict', () => {
    const answer = { type: 'toy_word', response: { word: 'Paris' } };

    expect(toyRegistry.answerSchema.safeParse(answer).success).toBe(true);
    expect(toyRegistry.answerSchema.safeParse({ ...answer, elapsedMs: 900 }).success).toBe(false);
    expect(
      toyRegistry.answerSchema.safeParse({ ...answer, response: { word: 'Paris', sure: true } })
        .success,
    ).toBe(false);
    expect(toyRegistry.answerSchema.safeParse({ ...answer, type: 'toy_flag' }).success).toBe(false);
  });

  it('the player-question schema refuses an object that carries a key', () => {
    const { key, ...playerQuestion } = flagQuestion;

    expect(toyRegistry.playerQuestionSchema.safeParse({ ...playerQuestion, key }).success).toBe(
      false,
    );
    expect(toyRegistry.playerQuestionSchema.safeParse(playerQuestion).success).toBe(true);
  });

  it("runs a module's check as part of the question schema", () => {
    const result = toyRegistry.questionSchema.safeParse({
      type: 'toy_word',
      payload: { hint: 'Paris' },
      key: { word: 'Paris' },
    });

    expect(result.error?.issues).toMatchObject([
      { path: ['key', 'word'], message: 'The hint gives the word away.' },
    ]);
  });

  it("a module's check sees only a payload and key its schemas accepted", () => {
    const seen: unknown[] = [];
    const recorder = defineQuestionType({
      type: 'recorder',
      timeClass: 'choice',
      payloadSchema: z.strictObject({ size: z.number() }),
      keySchema: z.strictObject({ value: z.boolean() }),
      responseSchema: z.strictObject({ value: z.boolean() }),
      check: (question) => {
        seen.push(question);
        return [];
      },
      grade: () => incorrect(),
    });
    const { questionSchema } = createRegistry([recorder]);

    questionSchema.safeParse({ type: 'recorder', payload: { size: 'big' }, key: { value: true } });
    questionSchema.safeParse({ type: 'recorder', payload: { size: 2 }, key: { value: 'yes' } });
    expect(seen).toEqual([]);

    questionSchema.safeParse({ type: 'recorder', payload: { size: 2 }, key: { value: true } });
    expect(seen).toEqual([{ payload: { size: 2 }, key: { value: true } }]);
  });

  it('builds a tunables schema keyed by type, only for modules that declare one', () => {
    const { tunablesSchema } = toyRegistry;

    expect(tunablesSchema.parse({ toy_word: { ignoreCase: true } })).toEqual({
      toy_word: { ignoreCase: true },
    });
    expect(tunablesSchema.safeParse({}).success).toBe(false);
    expect(tunablesSchema.safeParse({ toy_word: {}, toy_flag: {} }).success).toBe(false);
    expect(tunablesSchema.safeParse({ toy_word: { ignoreCase: true }, toy_flag: {} }).success).toBe(
      false,
    );
  });

  it('get returns the module, or undefined for an unknown type', () => {
    expect(toyRegistry.get('toy_flag')).toBe(toyFlag);
    expect(toyRegistry.get('toy_word')).toBe(toyWord);
    expect(toyRegistry.get('nope')).toBeUndefined();
    // Names every object inherits are not question types.
    expect(toyRegistry.get('constructor')).toBeUndefined();
    expect(toyRegistry.get('__proto__')).toBeUndefined();
  });

  it('refuses an empty list and a repeated type id at construction', () => {
    expect(() => createRegistry([])).toThrow('at least one question type');
    expect(() => createRegistry([toyFlag, toyWord, toyFlag])).toThrow('"toy_flag"');
  });

  it("can't be altered once built", () => {
    expect(Object.isFrozen(toyRegistry)).toBe(true);
    expect(Object.isFrozen(toyRegistry.types)).toBe(true);
  });
});

describe('grades', () => {
  it('grade constructors keep the credit invariants', () => {
    expect(correct()).toEqual({ status: 'correct', credit: 1 });
    expect(incorrect()).toEqual({ status: 'incorrect', credit: 0 });
    expect(incorrect(0.5)).toEqual({ status: 'incorrect', credit: 0.5 });
    expect(() => incorrect(1)).toThrow(RangeError);
    expect(() => incorrect(-0.1)).toThrow(RangeError);
    expect(() => incorrect(Number.NaN)).toThrow(RangeError);
    expect(unanswered()).toEqual({ status: 'unanswered', credit: 0 });
    expect(invalid('malformed')).toEqual({ status: 'invalid', credit: 0, reason: 'malformed' });
  });

  it('the grade schema accepts what the constructors build and nothing that breaks their rules', () => {
    for (const grade of [
      correct(),
      incorrect(),
      incorrect(0.5),
      unanswered(),
      invalid('unknown_type'),
    ]) {
      expect(gradeSchema.parse(grade)).toEqual(grade);
    }

    for (const broken of [
      { status: 'correct', credit: 0.5 },
      { status: 'correct', credit: 1, reason: 'malformed' },
      { status: 'incorrect', credit: 1 },
      { status: 'incorrect', credit: -0.5 },
      { status: 'unanswered', credit: 0.5 },
      { status: 'invalid', credit: 0 },
      { status: 'invalid', credit: 0, reason: 'bored' },
      { status: 'correct', credit: 1, points: 100 },
      { status: 'skipped', credit: 0 },
    ]) {
      expect(gradeSchema.safeParse(broken).success, JSON.stringify(broken)).toBe(false);
    }
  });
});
