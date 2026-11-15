import { addDays, daysBetween, type LocalDate } from './local-date.ts';
import {
  DEFAULT_GAME_RULES,
  isDailySet,
  type GameRules,
  type PlayMode,
  type SessionSource,
} from './rules.ts';
import { assertCount } from './validate.ts';

/**
 * Whether a completed session extends the streak (STK-01, ruling R2): either daily set,
 * or any other source with enough questions. A Practice replay never does. The score
 * doesn't matter.
 */
export function isQualifyingSession(
  session: { source: SessionSource; mode: PlayMode; questionCount: number },
  rules: GameRules = DEFAULT_GAME_RULES,
): boolean {
  assertCount(session.questionCount, 'questionCount');
  if (session.mode === 'practice') return false;
  return isDailySet(session.source) || session.questionCount >= rules.streak.minQuestions;
}

/**
 * - `inactive`: there is no streak.
 * - `lit`: today is credited (or a later date is, after a flight west).
 * - `at_risk`: the streak is alive and today is not credited yet.
 * - `frozen`: as `at_risk`, and a freeze covered yesterday.
 */
export type StreakStatus = 'inactive' | 'lit' | 'at_risk' | 'frozen';

export interface MilestoneHit {
  milestone: number;
  /** The credited date on which the streak reached the milestone. */
  date: LocalDate;
}

export interface StreakState {
  /** Credited days in the streak that is alive now. A frozen day keeps it alive but adds nothing. */
  current: number;
  /** The longest streak ever reached. It survives a break. */
  best: number;
  freezesHeld: number;
  status: StreakStatus;
  lastCreditedDate: LocalDate | null;
  /** Every day a freeze covered, oldest first. */
  frozenDates: readonly LocalDate[];
  /** Every milestone reached, oldest first. A new streak reaches the early ones again. */
  milestoneHits: readonly MilestoneHit[];
}

/**
 * The streak that follows from a set of credited local dates, seen on `today`.
 *
 * It is a replay of the rule over the whole set, so duplicates and the order the dates
 * arrived in can't change the answer (roadmap §4.3 item 4), and a session that syncs late
 * for a day a freeze had covered gives that freeze back.
 *
 * The rule, day by day: a credited day adds one, and a milestone grants freezes up to the
 * most a player may hold. A day that is over with no credit is covered by a held freeze;
 * with none held, the streak ends. Today is never held against the player.
 */
export function deriveStreak(
  creditedDates: Iterable<LocalDate>,
  today: LocalDate,
  rules: GameRules = DEFAULT_GAME_RULES,
): StreakState {
  const { milestones, maxFreezesHeld, freezesPerMilestone } = rules.streak;
  const dates = [...new Set(creditedDates)].sort();

  let current = 0;
  let best = 0;
  let freezesHeld = 0;
  const frozenDates: LocalDate[] = [];
  const milestoneHits: MilestoneHit[] = [];

  // The `missed` days after `from` went by with no credit. Counting them, not walking them,
  // keeps a player who returns after years as cheap as one who missed a day.
  const passMissedDays = (from: LocalDate, missed: number): void => {
    if (missed <= 0 || current === 0) return;
    const covered = Math.min(freezesHeld, missed);
    for (let offset = 1; offset <= covered; offset++) frozenDates.push(addDays(from, offset));
    freezesHeld -= covered;
    if (covered < missed) current = 0;
  };

  let previous: LocalDate | null = null;
  for (const date of dates) {
    if (previous !== null) {
      // Only days before today are over. A gap that reaches past today is not missed yet.
      const daysOver = Math.min(daysBetween(previous, date), daysBetween(previous, today)) - 1;
      passMissedDays(previous, daysOver);
    }
    current += 1;
    best = Math.max(best, current);
    if (milestones.includes(current)) {
      milestoneHits.push({ milestone: current, date });
      freezesHeld = Math.min(maxFreezesHeld, freezesHeld + freezesPerMilestone);
    }
    previous = date;
  }
  if (previous !== null) passMissedDays(previous, daysBetween(previous, today) - 1);

  let status: StreakStatus;
  if (current === 0) status = 'inactive';
  else if (previous !== null && previous >= today) status = 'lit';
  else status = frozenDates.includes(addDays(today, -1)) ? 'frozen' : 'at_risk';

  return {
    current,
    best,
    freezesHeld,
    status,
    lastCreditedDate: previous,
    frozenDates,
    milestoneHits,
  };
}

/** The next milestone after a streak of this length, or `null` past the last one (STK-06). */
export function nextMilestone(
  streak: number,
  rules: GameRules = DEFAULT_GAME_RULES,
): number | null {
  const ahead = rules.streak.milestones.filter((milestone) => milestone > streak);
  return ahead.length > 0 ? Math.min(...ahead) : null;
}
