// The rules of streaks, XP, levels and the daily goal, as pure functions (roadmap §7).
// The API is the authority that calls them; the app calls the same ones for its optimistic
// display. The current time and the player's time zone always arrive as arguments.

export {
  addDays,
  daysBetween,
  isValidTimeZone,
  localDateOf,
  parseLocalDate,
  type LocalDate,
} from './local-date.ts';
export { DEFAULT_GAME_RULES, type GameRules, type PlayMode, type SessionSource } from './rules.ts';
export {
  deriveStreak,
  isQualifyingSession,
  nextMilestone,
  streakFromCompletions,
  type Completion,
  type MilestoneHit,
  type StreakState,
  type StreakStatus,
} from './streak.ts';
export { cappedPendingXp, optimisticXp, sessionXp, type PendingXp } from './xp.ts';
export {
  levelForXp,
  levelProgress,
  levelsGained,
  xpToReachLevel,
  type LevelProgress,
} from './levels.ts';
export { dailyGoalProgress, type DailyGoalProgress, type DailyGoalTier } from './daily-goal.ts';
