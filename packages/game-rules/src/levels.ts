import { DEFAULT_GAME_RULES, type GameRules } from './rules.ts';
import { assertCount } from './validate.ts';

// The curve (XP-02, ADR 0004): going from level L to L+1 costs `stepXp × L`, so each level
// costs more than the last and reaching level L takes `stepXp × L × (L − 1) / 2` in total.
// Everyone starts at level 1 and there is no top level.

function stepOf(rules: GameRules): number {
  const { stepXp } = rules.levels;
  if (!Number.isFinite(stepXp) || stepXp <= 0) {
    throw new RangeError(`levels.stepXp must be more than zero, got ${String(stepXp)}`);
  }
  return stepXp;
}

/** The total XP at which a player reaches `level`. */
export function xpToReachLevel(level: number, rules: GameRules = DEFAULT_GAME_RULES): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError(`level must be a whole number of 1 or more, got ${String(level)}`);
  }
  return (stepOf(rules) * level * (level - 1)) / 2;
}

/** The level of a player with `totalXp`. */
export function levelForXp(totalXp: number, rules: GameRules = DEFAULT_GAME_RULES): number {
  assertCount(totalXp, 'totalXp');
  // The closed form can land a level out when the step is not a whole number. The loops
  // settle it against `xpToReachLevel`, which the XP bar also reads, so the two always agree.
  const estimate = Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / stepOf(rules))) / 2);
  let level = Math.max(1, estimate);
  while (xpToReachLevel(level + 1, rules) <= totalXp) level += 1;
  while (level > 1 && xpToReachLevel(level, rules) > totalXp) level -= 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned since reaching this level. */
  xpIntoLevel: number;
  /** XP this level takes from start to finish. */
  xpForLevel: number;
  /** How far through the level the player is, from 0 up to but not including 1. */
  fraction: number;
}

/** Where a player stands inside their level, for the XP bar. */
export function levelProgress(
  totalXp: number,
  rules: GameRules = DEFAULT_GAME_RULES,
): LevelProgress {
  const level = levelForXp(totalXp, rules);
  const xpIntoLevel = totalXp - xpToReachLevel(level, rules);
  const xpForLevel = stepOf(rules) * level;
  return { level, xpIntoLevel, xpForLevel, fraction: xpIntoLevel / xpForLevel };
}

/**
 * How many levels a change in XP crosses, for the level-up celebration. It is 0 when the
 * total didn't rise, as when the server's total replaces a higher optimistic one.
 */
export function levelsGained(
  xpBefore: number,
  xpAfter: number,
  rules: GameRules = DEFAULT_GAME_RULES,
): number {
  return Math.max(0, levelForXp(xpAfter, rules) - levelForXp(xpBefore, rules));
}
