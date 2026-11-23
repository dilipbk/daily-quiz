import { describe, expect, it } from 'vitest';
import { mvpQuestionTypes, mvpRegistry, specMvpTunables } from '../../src/types/index.ts';

describe('the MVP catalogue', () => {
  it('QT-01: the five MVP types are registered', () => {
    expect(mvpRegistry.types).toEqual([
      'single_choice',
      'true_false',
      'image_choice',
      'type_answer',
      'ordering',
    ]);
    for (const module of mvpQuestionTypes) {
      expect(mvpRegistry.get(module.type), module.type).toBe(module);
    }

    // Spec §10.3: picking an answer gets the shorter Standard limit, constructing one the longer.
    expect(
      Object.fromEntries(mvpQuestionTypes.map((module) => [module.type, module.timeClass])),
    ).toEqual({
      single_choice: 'choice',
      true_false: 'choice',
      image_choice: 'choice',
      type_answer: 'constructed',
      ordering: 'constructed',
    });

    expect(Object.keys(specMvpTunables)).toEqual(['type_answer']);
    expect(mvpRegistry.tunablesSchema.safeParse(specMvpTunables).success).toBe(true);
  });
});
