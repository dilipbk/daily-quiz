import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { dailyGoalProgress } from '../src/daily-goal.ts';
import { DEFAULT_GAME_RULES, type GameRules } from '../src/rules.ts';

const withGoals = (overrides: Partial<GameRules['dailyGoal']>): GameRules => ({
  ...DEFAULT_GAME_RULES,
  dailyGoal: { ...DEFAULT_GAME_RULES.dailyGoal, ...overrides },
});

describe('dailyGoalProgress (XP-03)', () => {
  it.each([
    ['casual', 20],
    ['regular', 50],
    ['serious', 100],
  ] as const)('sets the %s goal at %i XP', (tier, target) => {
    expect(dailyGoalProgress(0, tier)).toEqual({
      target,
      earned: 0,
      remaining: target,
      fraction: 0,
      met: false,
    });
  });

  it('fills the ring in proportion to the XP earned today', () => {
    expect(dailyGoalProgress(10, 'casual')).toEqual({
      target: 20,
      earned: 10,
      remaining: 10,
      fraction: 0.5,
      met: false,
    });
  });

  it('is met exactly at the target', () => {
    expect(dailyGoalProgress(19, 'casual').met).toBe(false);
    expect(dailyGoalProgress(20, 'casual')).toMatchObject({ remaining: 0, fraction: 1, met: true });
  });

  it('keeps the ring full, not overfull, past the target', () => {
    expect(dailyGoalProgress(250, 'serious')).toEqual({
      target: 100,
      earned: 250,
      remaining: 0,
      fraction: 1,
      met: true,
    });
  });

  it('reads the targets from the rules', () => {
    expect(dailyGoalProgress(15, 'casual', withGoals({ casual: 30 }))).toMatchObject({
      target: 30,
      fraction: 0.5,
    });
  });

  it('treats a target of 0 from the rules as already met', () => {
    expect(dailyGoalProgress(0, 'casual', withGoals({ casual: 0 }))).toEqual({
      target: 0,
      earned: 0,
      remaining: 0,
      fraction: 1,
      met: true,
    });
  });

  it.each([-1, 1.5, Number.NaN])('refuses %j XP', (xp) => {
    expect(() => dailyGoalProgress(xp, 'regular')).toThrow(RangeError);
  });

  it('keeps the ring between empty and full for any XP and tier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.constantFrom('casual', 'regular', 'serious'),
        (xp, tier) => {
          const progress = dailyGoalProgress(xp, tier);
          expect(progress.fraction).toBeGreaterThanOrEqual(0);
          expect(progress.fraction).toBeLessThanOrEqual(1);
          expect(progress.met).toBe(xp >= progress.target);
          expect(progress.remaining).toBe(Math.max(0, progress.target - xp));
          expect(progress.met).toBe(progress.fraction === 1);
        },
      ),
    );
  });
});
