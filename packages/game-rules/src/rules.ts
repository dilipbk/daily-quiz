/** Where a session's questions came from. */
export type SessionSource = 'global_daily' | 'daily_5' | 'quiz' | 'challenge';

/** How a session was played (PLAY-02). Practice is a replay of a completed quiz. */
export type PlayMode = 'standard' | 'relaxed' | 'practice';

/**
 * Every value the spec marks *(tunable)*, plus the ones the owner ruled on (ADR 0004).
 * Remote config serves these; a running session keeps the values it started with.
 */
export interface GameRules {
  readonly streak: {
    /** STK-01: a session that is not a daily set qualifies from this many questions. */
    readonly minQuestions: number;
    /** STK-06: streak lengths that are celebrated and earn a badge. */
    readonly milestones: readonly number[];
    /** STK-04: the most freezes a player can hold. */
    readonly maxFreezesHeld: number;
    /** STK-04: freezes earned at each milestone. */
    readonly freezesPerMilestone: number;
  };
  readonly xp: {
    /** XP-01: for completing a session. */
    readonly perSession: number;
    /** XP-01: for each correct answer. */
    readonly perCorrectAnswer: number;
    /** XP-01: when every answer is correct. */
    readonly perfectBonus: number;
    /** PLAY-02: the share of XP a Practice replay earns. A replayed daily earns none (DLY-03). */
    readonly practiceFactor: number;
    /** XP-04: the most XP unsynced sessions can add to one local day before the server validates them. */
    readonly offlineDailyCap: number;
  };
  readonly levels: {
    /** XP-02: going from level L to L+1 costs `stepXp × L`. */
    readonly stepXp: number;
  };
  /** XP-03: the XP target of each daily-goal tier. */
  readonly dailyGoal: {
    readonly casual: number;
    readonly regular: number;
    readonly serious: number;
  };
}

export const DEFAULT_GAME_RULES: GameRules = Object.freeze({
  streak: Object.freeze({
    minQuestions: 5,
    milestones: Object.freeze([3, 7, 14, 30, 50, 100, 365]),
    maxFreezesHeld: 2,
    freezesPerMilestone: 1,
  }),
  xp: Object.freeze({
    perSession: 10,
    perCorrectAnswer: 2,
    perfectBonus: 10,
    practiceFactor: 0.5,
    offlineDailyCap: 100,
  }),
  levels: Object.freeze({ stepXp: 20 }),
  dailyGoal: Object.freeze({ casual: 20, regular: 50, serious: 100 }),
});

/** Whether the source is one of the two daily sets (D5-02). */
export function isDailySet(source: SessionSource): boolean {
  return source === 'global_daily' || source === 'daily_5';
}
