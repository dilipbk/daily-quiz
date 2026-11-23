import { specMvpTunables, specScoringConfig, specTimingConfig } from '@repo/quiz-engine';
import type { Config } from '../areas/config.ts';
import type { GameRules } from '../rules.ts';

/** The rules of ADR 0004's table: the defaults `packages/game-rules` ships with. */
export const gameRulesFixture: GameRules = {
  streak: {
    minQuestions: 5,
    milestones: [3, 7, 14, 30, 50, 100, 365],
    maxFreezesHeld: 2,
    freezesPerMilestone: 1,
  },
  xp: {
    perSession: 10,
    perCorrectAnswer: 2,
    perfectBonus: 10,
    practiceFactor: 0.5,
    offlineDailyCap: 100,
  },
  levels: { stepXp: 20 },
  dailyGoal: { casual: 20, regular: 50, serious: 100 },
};

/** A config with every tunable at the spec's value. */
export const configFixture: Config = {
  version: 'cfg-2026-11-21-1',
  serverTime: '2026-11-21T18:03:11.482Z',
  minAppVersion: { ios: '1.0.0', android: '1.0.0' },
  updateUrl: { android: 'https://play.google.com/store/apps/details?id=app.example.quiz' },
  flags: { daily_5: false, challenges: false, share_card: true },
  tunables: {
    scoring: specScoringConfig,
    timing: specTimingConfig,
    questionTypes: specMvpTunables,
    gameRules: gameRulesFixture,
  },
};
