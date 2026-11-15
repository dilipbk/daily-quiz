import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { levelForXp, levelProgress, levelsGained, xpToReachLevel } from '../src/levels.ts';
import { DEFAULT_GAME_RULES, type GameRules } from '../src/rules.ts';

const withStep = (stepXp: number): GameRules => ({ ...DEFAULT_GAME_RULES, levels: { stepXp } });

describe('the level curve (XP-02, ADR 0004)', () => {
  it.each([
    [1, 0],
    [2, 20],
    [3, 60],
    [5, 200],
    [10, 900],
    [20, 3800],
    [30, 8700],
  ])('reaches level %i at %i XP', (level, xp) => {
    expect(xpToReachLevel(level)).toBe(xp);
  });

  it.each([
    [0, 1],
    [19, 1],
    [20, 2],
    [59, 2],
    [60, 3],
    [899, 9],
    [900, 10],
  ])('puts a player with %i XP at level %i', (xp, level) => {
    expect(levelForXp(xp)).toBe(level);
  });

  it('reports progress through the current level', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForLevel: 20, fraction: 0 });
    expect(levelProgress(30)).toEqual({
      level: 2,
      xpIntoLevel: 10,
      xpForLevel: 40,
      fraction: 0.25,
    });
  });

  it('counts the levels a gain of XP crosses, for the celebration', () => {
    expect(levelsGained(15, 65)).toBe(2);
    expect(levelsGained(20, 25)).toBe(0);
    expect(levelsGained(0, 0)).toBe(0);
  });

  it('counts no level-up when a reconciled total is lower than the optimistic one', () => {
    expect(levelsGained(65, 15)).toBe(0);
  });

  it('reads the step from the rules', () => {
    expect(xpToReachLevel(3, withStep(50))).toBe(150);
    expect(levelForXp(149, withStep(50))).toBe(2);
    expect(levelForXp(3, withStep(1))).toBe(3);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses %j XP', (xp) => {
    expect(() => levelForXp(xp)).toThrow(RangeError);
    expect(() => levelProgress(xp)).toThrow(RangeError);
  });

  it.each([0, -3, 1.5, Number.NaN])('refuses level %j', (level) => {
    expect(() => xpToReachLevel(level)).toThrow(RangeError);
  });

  it.each([0, -20, Number.NaN])('refuses a step of %j XP from the rules', (stepXp) => {
    expect(() => levelForXp(100, withStep(stepXp))).toThrow(RangeError);
    expect(() => xpToReachLevel(2, withStep(stepXp))).toThrow(RangeError);
  });

  // With a step that is not a whole number, the square-root shortcut alone lands a level out
  // for each of these totals. The answer must still agree with `xpToReachLevel`.
  it.each([
    [82, 0.1],
    [3, 0.2],
    [132, 1.1],
    [330, 1.1],
    [201, 0.01],
  ])('keeps %i XP inside its level at a step of %f XP', (total, stepXp) => {
    const rules = withStep(stepXp);
    const level = levelForXp(total, rules);
    expect(xpToReachLevel(level, rules)).toBeLessThanOrEqual(total);
    expect(xpToReachLevel(level + 1, rules)).toBeGreaterThan(total);
    expect(levelProgress(total, rules).xpIntoLevel).toBeGreaterThanOrEqual(0);
  });

  it('keeps any XP total inside its level for a step that is not a whole number', () => {
    const fractionalStep = fc.double({ min: 0.01, max: 50, noNaN: true });
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), fractionalStep, (total, stepXp) => {
        const rules = withStep(stepXp);
        const level = levelForXp(total, rules);
        expect(xpToReachLevel(level, rules)).toBeLessThanOrEqual(total);
        expect(xpToReachLevel(level + 1, rules)).toBeGreaterThan(total);
      }),
      { numRuns: 1000 },
    );
  });

  const xp = fc.integer({ min: 0, max: 1_000_000_000 });
  const step = fc.integer({ min: 1, max: 1000 });

  it('puts any XP total inside the bracket of its level', () => {
    fc.assert(
      fc.property(xp, step, (xp, step) => {
        const rules = withStep(step);
        const level = levelForXp(xp, rules);
        expect(xpToReachLevel(level, rules)).toBeLessThanOrEqual(xp);
        expect(xpToReachLevel(level + 1, rules)).toBeGreaterThan(xp);
      }),
      { numRuns: 1000 },
    );
  });

  it('is exact on both sides of every level boundary', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 40_000 }), step, (level, step) => {
        const rules = withStep(step);
        const threshold = xpToReachLevel(level, rules);
        expect(levelForXp(threshold, rules)).toBe(level);
        expect(levelForXp(threshold - 1, rules)).toBe(level - 1);
      }),
      { numRuns: 1000 },
    );
  });

  it('never lowers a level for more XP, and charges more for each level than the last', () => {
    fc.assert(
      fc.property(xp, fc.integer({ min: 0, max: 100_000 }), step, (xp, more, step) => {
        const rules = withStep(step);
        const level = levelForXp(xp, rules);
        expect(levelForXp(xp + more, rules)).toBeGreaterThanOrEqual(level);

        const cost = xpToReachLevel(level + 1, rules) - xpToReachLevel(level, rules);
        const nextCost = xpToReachLevel(level + 2, rules) - xpToReachLevel(level + 1, rules);
        expect(cost).toBe(step * level);
        expect(nextCost).toBeGreaterThan(cost);
      }),
    );
  });

  it('keeps progress consistent with the curve', () => {
    fc.assert(
      fc.property(xp, step, (xp, step) => {
        const rules = withStep(step);
        const progress = levelProgress(xp, rules);
        expect(progress.level).toBe(levelForXp(xp, rules));
        expect(progress.xpIntoLevel).toBe(xp - xpToReachLevel(progress.level, rules));
        expect(progress.xpForLevel).toBe(step * progress.level);
        expect(progress.fraction).toBeGreaterThanOrEqual(0);
        expect(progress.fraction).toBeLessThan(1);
      }),
    );
  });
});
