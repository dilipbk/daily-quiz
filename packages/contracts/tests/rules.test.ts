import { describe, expect, it } from 'vitest';
import { gameRulesFixture } from '../src/fixtures/config.ts';
import {
  dailyGoalTierSchema,
  gameRulesSchema,
  playModeSchema,
  sessionSourceSchema,
} from '../src/rules.ts';
import { without } from './support.ts';

// `packages/game-rules` trusts the rules it is handed: a bad value reaches a streak or an XP
// total as `NaN` (ENG-03). Remote config serves these values, so this schema is the gate.

/** The fixture with one value replaced, by path. */
const rulesWith = (group: string, key: string, value: unknown): unknown => {
  const rules: Record<string, object> = gameRulesFixture;
  return { ...rules, [group]: { ...rules[group], [key]: value } };
};

const refuses = (value: unknown) => !gameRulesSchema.safeParse(value).success;

describe('game rules', () => {
  it('the defaults of ADR 0004 parse', () => {
    expect(gameRulesSchema.parse(gameRulesFixture)).toEqual(gameRulesFixture);
    expect(gameRulesFixture).toEqual({
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
    });
  });

  it.each([
    ['NaN where a count belongs', 'xp', 'perSession', Number.NaN],
    ['Infinity where a count belongs', 'xp', 'offlineDailyCap', Number.POSITIVE_INFINITY],
    ['a fraction where a count belongs', 'xp', 'perCorrectAnswer', 2.5],
    ['a negative count', 'xp', 'perfectBonus', -10],
    ['a number as text', 'xp', 'perSession', '10'],
    ['a level step of zero', 'levels', 'stepXp', 0],
    ['a level step that is no number', 'levels', 'stepXp', Number.NaN],
    ['a practice factor above 1', 'xp', 'practiceFactor', 1.5],
    ['a practice factor below 0', 'xp', 'practiceFactor', -0.1],
    ['a practice factor that is no number', 'xp', 'practiceFactor', Number.NaN],
    ['milestones out of order', 'streak', 'milestones', [7, 3]],
    ['a milestone listed twice', 'streak', 'milestones', [3, 3]],
    ['a milestone of zero days', 'streak', 'milestones', [0, 3]],
    ['a fractional milestone', 'streak', 'milestones', [3.5]],
    ['a qualifying length of zero', 'streak', 'minQuestions', 0],
    ['a negative freeze count', 'streak', 'maxFreezesHeld', -1],
    ['a goal of zero', 'dailyGoal', 'casual', 0],
    ['a casual goal above the regular one', 'dailyGoal', 'casual', 60],
    ['a regular goal above the serious one', 'dailyGoal', 'regular', 101],
  ])('refuses %s', (_name, group, key, value) => {
    expect(refuses(rulesWith(group, key, value))).toBe(true);
  });

  // A rule added later must not cost an older app its whole config, kill switches included.
  it('a rule this build does not know is dropped, and the rest still parses', () => {
    const fromANewerServer = rulesWith('xp', 'perStreakDay', 5);

    expect(gameRulesSchema.parse(fromANewerServer)).toEqual(gameRulesFixture);
    expect(gameRulesSchema.parse({ ...gameRulesFixture, leagues: { size: 30 } })).toEqual(
      gameRulesFixture,
    );
  });

  it('refuses rules with a group missing', () => {
    expect(refuses(without(gameRulesFixture, 'levels'))).toBe(true);
  });

  it('accepts the edges: no milestones, no freezes, a practice factor of 0 or 1, equal goals', () => {
    expect(refuses(rulesWith('streak', 'milestones', []))).toBe(false);
    expect(refuses(rulesWith('streak', 'maxFreezesHeld', 0))).toBe(false);
    expect(refuses(rulesWith('xp', 'practiceFactor', 0))).toBe(false);
    expect(refuses(rulesWith('xp', 'practiceFactor', 1))).toBe(false);
    expect(refuses(rulesWith('dailyGoal', 'casual', 50))).toBe(false);
  });
});

describe('the lists game-rules switches on', () => {
  it('a source, a mode and a tier are the ones game-rules names', () => {
    expect(sessionSourceSchema.options).toEqual(['global_daily', 'daily_5', 'quiz', 'challenge']);
    expect(playModeSchema.options).toEqual(['standard', 'relaxed', 'practice']);
    expect(dailyGoalTierSchema.options).toEqual(['casual', 'regular', 'serious']);
  });

  it('a source, a mode and a tier outside the lists are refused', () => {
    expect(sessionSourceSchema.safeParse('live_event').success).toBe(false);
    expect(playModeSchema.safeParse('Standard').success).toBe(false);
    expect(dailyGoalTierSchema.safeParse('constructor').success).toBe(false);
    expect(dailyGoalTierSchema.safeParse(undefined).success).toBe(false);
  });
});
