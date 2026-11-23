import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { gradeAnswer } from '../src/core/grading.ts';
import { gradingFixtures } from '../src/fixtures/index.ts';
import { mvpRegistry, specMvpTunables } from '../src/types/index.ts';
import { mvpKits } from './support/arbitraries.ts';
import { describeRegistryProperties } from './support/registry-properties.ts';

// The properties every question type must hold (QT-02, "graders are pure"), run twice over the
// MVP registry: on generated questions, and on the questions of the shared fixtures.

const locale = fc.constantFrom('en', 'en-GB', 'es', 'pt-BR', 'hi');

describeRegistryProperties('MVP registry', mvpRegistry, mvpKits, specMvpTunables, locale);

const fixtureQuestionsOf = (type: string) => [
  ...new Set(
    gradingFixtures
      .filter((fixture) => fixture.question.type === type)
      .map((fixture) => fixture.question),
  ),
];

describeRegistryProperties(
  'MVP registry, fixture questions',
  mvpRegistry,
  mvpKits.map((kit) => ({ ...kit, question: fc.constantFrom(...fixtureQuestionsOf(kit.type)) })),
  specMvpTunables,
  locale,
);

describe('MVP registry: stored order', () => {
  const optionsSchema = z.object({ options: z.array(z.unknown()) });
  const optionKits = mvpKits.filter((kit) => ['single_choice', 'image_choice'].includes(kit.type));

  it('the order of options in the payload never changes a grade', () => {
    const cases = fc.constantFrom(...optionKits).chain((kit) =>
      kit.question.chain((question) => {
        const { options } = optionsSchema.parse(question.payload);
        const tagged = (response: unknown) => ({ type: kit.type, response });

        return fc.record({
          question: fc.constant(question),
          shuffled: fc.shuffledSubarray(options, { minLength: options.length }),
          answer: fc.oneof(
            fc.constant(tagged(kit.correctResponse(question))),
            kit.wrongResponse(question).map(tagged),
            fc.string().map((optionId) => tagged({ optionId })),
          ),
        });
      }),
    );

    fc.assert(
      fc.property(cases, locale, ({ question, shuffled, answer }, questionLocale) => {
        const context = { locale: questionLocale, tunables: specMvpTunables };
        const reordered = { ...question, payload: { options: shuffled } };

        expect(gradeAnswer(mvpRegistry, reordered, answer, context)).toEqual(
          gradeAnswer(mvpRegistry, question, answer, context),
        );
      }),
    );
  });
});
