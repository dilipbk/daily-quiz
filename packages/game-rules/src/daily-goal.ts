import { DEFAULT_GAME_RULES, type GameRules } from './rules.ts';
import { assertCount } from './validate.ts';

/** The daily goal a player picks (XP-03). */
export type DailyGoalTier = 'casual' | 'regular' | 'serious';

export interface DailyGoalProgress {
  target: number;
  earned: number;
  remaining: number;
  /** How full the ring is, from 0 to 1. It stays at 1 past the target. */
  fraction: number;
  met: boolean;
}

/** The state of the goal ring for the XP credited to today, whatever mode earned it. */
export function dailyGoalProgress(
  xpToday: number,
  tier: DailyGoalTier,
  rules: GameRules = DEFAULT_GAME_RULES,
): DailyGoalProgress {
  assertCount(xpToday, 'xpToday');
  const target = rules.dailyGoal[tier];
  const met = xpToday >= target;
  return {
    target,
    earned: xpToday,
    remaining: Math.max(0, target - xpToday),
    fraction: met ? 1 : xpToday / target,
    met,
  };
}
