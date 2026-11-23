import { describe, expect, it } from 'vitest';
import * as fixtures from '../src/fixtures/index.ts';
import * as engine from '../src/index.ts';

// What `@repo/quiz-engine` and `@repo/quiz-engine/fixtures` export at run time. `contracts`, the
// app, the API and the content tools build on these names, so adding or removing one is a
// deliberate edit to the lists below. The exported types are listed in tests/node/boundaries.test.ts.

describe('public API', () => {
  it('the package exports what the plan lists and nothing else', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'correct',
      'createRegistry',
      'defineQuestionType',
      'difficultyMultiplier',
      'evaluateSession',
      'gradeAnswer',
      'gradeSchema',
      'incorrect',
      'invalid',
      'maxResponseLength',
      'mvpQuestionTypes',
      'mvpRegistry',
      'normalizeAnswerText',
      'runGradingFixtures',
      'runScoringFixtures',
      'scoreAnswer',
      'scoreInputSchema',
      'scoreSession',
      'scoringConfigSchema',
      'specMvpTunables',
      'specScoringConfig',
      'specTimingConfig',
      'specTypeAnswerTunables',
      'standardLimitMs',
      'timingConfigSchema',
      'toPlayerQuestion',
      'typeAnswerTunablesSchema',
      'unanswered',
    ]);
    expect(Object.keys(fixtures).sort()).toEqual([
      'gradingFixtures',
      'runSharedFixtures',
      'scoringFixtures',
    ]);
  });

  it('maxResponseLength is the cap the answer schema holds, so an answer field capped at it never sends a malformed answer', () => {
    const typed = (text: string) => ({ type: 'type_answer', response: { text } });
    const parses = (text: string) => engine.mvpRegistry.answerSchema.safeParse(typed(text)).success;

    expect(engine.maxResponseLength).toBe(256);
    expect(parses('a'.repeat(engine.maxResponseLength))).toBe(true);
    expect(parses('a'.repeat(engine.maxResponseLength + 1))).toBe(false);

    // The cap counts UTF-16 units, as `text.length` does: an emoji is two of them.
    const emoji = String.fromCodePoint(0x1f600);
    expect(parses(emoji.repeat(engine.maxResponseLength / 2))).toBe(true);
    expect(parses(`${emoji.repeat(engine.maxResponseLength / 2)}a`)).toBe(false);
  });
});
