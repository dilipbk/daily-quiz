import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { gradeAnswer, toPlayerQuestion } from '../../src/core/grading.ts';
import { correct, invalid } from '../../src/core/module.ts';
import type { AnyQuestionTypeModule, Registry, TunablesOf } from '../../src/core/registry.ts';

// The properties every question type must hold, whatever it is (QT-02, "graders are pure"). A
// registry passes them through kits: one per type, saying how to draw a sound question and how
// to answer it rightly and wrongly. A new type gets these properties by adding a kit.

interface KeyedQuestion {
  readonly type: string;
  readonly payload: unknown;
  readonly key: unknown;
}

export interface TypeKit {
  readonly type: string;
  /** Only questions the registry's question schema accepts. */
  readonly question: fc.Arbitrary<{ type: string; payload: unknown; key: unknown }>;
  readonly correctResponse: (question: { payload: unknown; key: unknown }) => unknown;
  readonly wrongResponse: (question: { payload: unknown; key: unknown }) => fc.Arbitrary<unknown>;
}

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const jsonCopy = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export function describeRegistryProperties<M extends readonly AnyQuestionTypeModule[]>(
  label: string,
  registry: Registry<M>,
  kits: readonly TypeKit[],
  tunables: TunablesOf<M>,
  locale: fc.Arbitrary<string>,
): void {
  const contextFor = (questionLocale: string, withTunables = tunables) => ({
    locale: questionLocale,
    tunables: withTunables,
  });

  describe(label, () => {
    it('has a kit for every registered type', () => {
      expect(kits.map((kit) => kit.type).sort()).toEqual([...registry.types].sort());
    });
  });

  describe.each(kits)(`${label}: $type`, (kit) => {
    const tagged = (response: unknown) => ({ type: kit.type, response });
    const rightAnswer = (question: KeyedQuestion) => tagged(kit.correctResponse(question));
    const wrongAnswer = (question: KeyedQuestion) => kit.wrongResponse(question).map(tagged);

    const questionAndAnswer = kit.question.chain((question) =>
      fc.tuple(
        fc.constant(question),
        fc.oneof(fc.constant(rightAnswer(question)), wrongAnswer(question), fc.jsonValue()),
      ),
    );

    const otherKits = kits.filter((other) => other.type !== kit.type);
    const answerToAnotherType = fc.oneof(
      // A sound answer to a question of another type…
      fc.constantFrom(...otherKits).chain((other) =>
        other.question.map((question) => ({
          type: other.type,
          response: other.correctResponse(question),
        })),
      ),
      // …and anything at all under another type's tag.
      fc.record({
        type: fc.constantFrom(...otherKits.map((other) => other.type)),
        response: fc.jsonValue(),
      }),
    );

    it('QT-02: grading the same question and answer twice gives deep-equal grades', () => {
      fc.assert(
        fc.property(questionAndAnswer, locale, ([question, answer], questionLocale) => {
          const context = contextFor(questionLocale);

          expect(gradeAnswer(registry, question, answer, context)).toEqual(
            gradeAnswer(registry, question, answer, context),
          );
        }),
      );
    });

    it('graders are total: any JSON value as the answer yields a grade and never throws', () => {
      fc.assert(
        fc.property(kit.question, fc.jsonValue(), locale, (question, answer, questionLocale) => {
          const grade = gradeAnswer(registry, question, answer, contextFor(questionLocale));

          expect(['correct', 'incorrect', 'unanswered', 'invalid']).toContain(grade.status);
        }),
      );
    });

    it('grade invariants hold', () => {
      const anyAnswer = fc.oneof(
        questionAndAnswer,
        fc.tuple(kit.question, fc.constantFrom(null, undefined)),
      );

      fc.assert(
        fc.property(anyAnswer, locale, ([question, answer], questionLocale) => {
          const grade = gradeAnswer(registry, question, answer, contextFor(questionLocale));

          expect(grade.credit === 1).toBe(grade.status === 'correct');
          expect(grade.credit).toBeGreaterThanOrEqual(0);
          expect(grade.credit).toBeLessThanOrEqual(1);
          if (grade.status === 'unanswered' || grade.status === 'invalid') {
            expect(grade.credit).toBe(0);
          }
          expect(grade.reason !== undefined).toBe(grade.status === 'invalid');
        }),
      );
    });

    it('the response built from the key is correct', () => {
      fc.assert(
        fc.property(kit.question, locale, (question, questionLocale) => {
          expect(
            gradeAnswer(registry, question, rightAnswer(question), contextFor(questionLocale)),
          ).toEqual(correct());
        }),
      );
    });

    it('a response the kit calls wrong is never correct', () => {
      const questionAndWrongAnswer = kit.question.chain((question) =>
        fc.tuple(fc.constant(question), wrongAnswer(question)),
      );

      fc.assert(
        fc.property(questionAndWrongAnswer, locale, ([question, answer], questionLocale) => {
          const grade = gradeAnswer(registry, question, answer, contextFor(questionLocale));

          expect(grade.status).not.toBe('correct');
        }),
      );
    });

    it.skipIf(otherKits.length === 0)(
      'an answer tagged with any other registered type is invalid: type_mismatch',
      () => {
        fc.assert(
          fc.property(
            kit.question,
            answerToAnotherType,
            locale,
            (question, answer, questionLocale) => {
              expect(gradeAnswer(registry, question, answer, contextFor(questionLocale))).toEqual(
                invalid('type_mismatch'),
              );
            },
          ),
        );
      },
    );

    it('every generated question parses, and its player form parses and has no key', () => {
      fc.assert(
        fc.property(kit.question, (question) => {
          const playerQuestion = toPlayerQuestion(question);

          expect(registry.questionSchema.safeParse(question).success).toBe(true);
          expect(registry.playerQuestionSchema.safeParse(playerQuestion).success).toBe(true);
          expect(playerQuestion).not.toHaveProperty('key');
        }),
      );
    });

    it('graders are pure: deep-frozen inputs are not mutated', () => {
      fc.assert(
        fc.property(questionAndAnswer, locale, ([question, answer], questionLocale) => {
          // Graded on copies, so freezing can't reach what the generators hold. `structuredClone`
          // isn't in the ES2022 library these tests compile against.
          const frozen = deepFreeze(jsonCopy({ question, answer, tunables })) as {
            question: KeyedQuestion;
            answer: unknown;
            tunables: TunablesOf<M>;
          };
          const before = JSON.stringify(frozen);

          // Writing to a frozen object throws in a module, so a grader that mutates fails here.
          gradeAnswer(
            registry,
            frozen.question,
            frozen.answer,
            contextFor(questionLocale, frozen.tunables),
          );

          expect(JSON.stringify(frozen)).toBe(before);
        }),
      );
    });
  });
}
