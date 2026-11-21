import * as z from 'zod';

// The values `packages/game-rules` computes with, as schemas (ENG-03). That package is pure
// arithmetic and trusts its arguments: a rule that is `NaN`, a fraction or out of order reaches a
// streak or an XP total as `NaN`. Remote config serves the rules, so they are checked here, once,
// when a config is read.
//
// The rules are objects that drop a key they don't name, as every response does (ADR 0023): a
// rule added later reaches an older app as a rule it never reads, and the rest of the config,
// the kill switches and the minimum version among it, still parses.
//
// The shapes follow `GameRules`, `SessionSource`, `PlayMode` and `DailyGoalTier` in
// packages/game-rules/src (ADR 0004). They are written out because that package can't be
// imported from this branch; ADR 0024 records the follow-up that ties the two together.

/** Where a session's questions came from. */
export const sessionSourceSchema = z.enum(['global_daily', 'daily_5', 'quiz', 'challenge']);

/** How a session was played (PLAY-02). Practice is a replay of a completed quiz. */
export const playModeSchema = z.enum(['standard', 'relaxed', 'practice']);

/** The daily goal a player picks (XP-03). */
export const dailyGoalTierSchema = z.enum(['casual', 'regular', 'serious']);

/** An amount of XP a rule grants. The cap keeps any sum of them a safe integer. */
const xpAmountSchema = z.int().min(0).max(1_000_000);

/** A daily goal's target. Zero would be met before the day began. */
const goalSchema = z.int().min(1).max(1_000_000);

const isStrictlyRising = (values: readonly number[]): boolean =>
  values.every((value, index) => index === 0 || value > (values[index - 1] ?? value));

export const gameRulesSchema = z.object({
  streak: z.object({
    /** STK-01: a session that is not a daily set qualifies from this many questions. */
    minQuestions: z.int().min(1).max(1000),
    /** STK-06: streak lengths that are celebrated, shortest first, each once. */
    milestones: z
      .array(z.int().min(1).max(100_000))
      .max(32)
      .refine(isStrictlyRising, { error: 'List each milestone once, shortest first.' }),
    /** STK-04: the most freezes a player can hold. */
    maxFreezesHeld: z.int().min(0).max(100),
    /** STK-04: freezes earned at each milestone. */
    freezesPerMilestone: z.int().min(0).max(100),
  }),
  xp: z.object({
    perSession: xpAmountSchema,
    perCorrectAnswer: xpAmountSchema,
    perfectBonus: xpAmountSchema,
    /** PLAY-02: the share of XP a Practice replay earns. */
    practiceFactor: z.number().min(0).max(1),
    /** XP-04: the most XP unsynced sessions add to one local day. */
    offlineDailyCap: xpAmountSchema,
  }),
  levels: z.object({
    /** XP-02: going from level L to L+1 costs `stepXp × L`. Zero would make every level free. */
    stepXp: z.int().min(1).max(1_000_000),
  }),
  /** XP-03: the XP target of each tier, none above the next. */
  dailyGoal: z
    .object({ casual: goalSchema, regular: goalSchema, serious: goalSchema })
    .refine(({ casual, regular, serious }) => casual <= regular && regular <= serious, {
      error: 'A goal must not be above the next tier: casual, then regular, then serious.',
    }),
});

export type SessionSource = z.infer<typeof sessionSourceSchema>;
export type PlayMode = z.infer<typeof playModeSchema>;
export type DailyGoalTier = z.infer<typeof dailyGoalTierSchema>;
export type GameRules = z.infer<typeof gameRulesSchema>;
