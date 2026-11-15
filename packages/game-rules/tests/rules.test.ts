import { describe, expect, it } from 'vitest';

import { DEFAULT_GAME_RULES } from '../src/rules.ts';

describe('DEFAULT_GAME_RULES', () => {
  it("holds the spec's tunables and the owner's rulings of 2026-11-15 (ADR 0004)", () => {
    expect(DEFAULT_GAME_RULES).toEqual({
      streak: {
        minQuestions: 5, // STK-01
        milestones: [3, 7, 14, 30, 50, 100, 365], // STK-06
        maxFreezesHeld: 2, // STK-04
        freezesPerMilestone: 1, // ruling R3
      },
      xp: {
        perSession: 10, // XP-01
        perCorrectAnswer: 2, // XP-01
        perfectBonus: 10, // XP-01
        practiceFactor: 0.5, // ruling R5
        offlineDailyCap: 100, // XP-04, ruling R5
      },
      levels: { stepXp: 20 }, // XP-02, ruling R4
      dailyGoal: { casual: 20, regular: 50, serious: 100 }, // XP-03
    });
  });
});
