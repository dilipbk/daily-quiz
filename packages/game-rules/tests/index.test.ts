import { describe, expect, it } from 'vitest';

import * as gameRules from '../src/index.ts';

describe('@repo/game-rules', () => {
  it('exports its rules and nothing internal', () => {
    expect(Object.keys(gameRules).sort()).toEqual([
      'DEFAULT_GAME_RULES',
      'addDays',
      'cappedPendingXp',
      'dailyGoalProgress',
      'daysBetween',
      'deriveStreak',
      'isQualifyingSession',
      'isValidTimeZone',
      'levelForXp',
      'levelProgress',
      'levelsGained',
      'localDateOf',
      'nextMilestone',
      'optimisticXp',
      'parseLocalDate',
      'sessionXp',
      'streakFromCompletions',
      'xpToReachLevel',
    ]);
  });
});
