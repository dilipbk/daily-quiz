import type { LocalDate } from './local-date.ts';
import {
  DEFAULT_GAME_RULES,
  isDailySet,
  type GameRules,
  type PlayMode,
  type SessionSource,
} from './rules.ts';
import { assertCount } from './validate.ts';

/**
 * The XP a completed session earns (XP-01): an amount for completing it, an amount per
 * correct answer, and a bonus when every answer is correct. Relaxed mode earns the same
 * as Standard. A Practice replay earns a share of that, rounded down, and a replayed
 * daily set earns nothing (PLAY-02, DLY-03, ADR 0004).
 */
export function sessionXp(
  session: {
    source: SessionSource;
    mode: PlayMode;
    correctAnswers: number;
    totalQuestions: number;
  },
  rules: GameRules = DEFAULT_GAME_RULES,
): number {
  const { source, mode, correctAnswers, totalQuestions } = session;
  assertCount(totalQuestions, 'totalQuestions');
  assertCount(correctAnswers, 'correctAnswers');
  if (correctAnswers > totalQuestions) {
    throw new RangeError(
      `correctAnswers (${String(correctAnswers)}) exceeds totalQuestions (${String(totalQuestions)})`,
    );
  }

  const { perSession, perCorrectAnswer, perfectBonus, practiceFactor } = rules.xp;
  const perfect = totalQuestions > 0 && correctAnswers === totalQuestions;
  const earned = perSession + perCorrectAnswer * correctAnswers + (perfect ? perfectBonus : 0);

  if (mode !== 'practice') return earned;
  return isDailySet(source) ? 0 : Math.floor(earned * practiceFactor);
}

/** XP from a session that is still in the outbox, with the local date it is credited to. */
export interface PendingXp {
  date: LocalDate;
  xp: number;
}

/**
 * What unsynced sessions may add to each local day, for the app's optimistic display
 * (XP-04): each day's sum, held at the offline cap until the server has validated it.
 */
export function cappedPendingXp(
  pending: Iterable<PendingXp>,
  rules: GameRules = DEFAULT_GAME_RULES,
): Map<LocalDate, number> {
  const cap = rules.xp.offlineDailyCap;
  const byDay = new Map<LocalDate, number>();
  for (const { date, xp } of pending) {
    assertCount(xp, 'xp');
    byDay.set(date, Math.min(cap, (byDay.get(date) ?? 0) + xp));
  }
  return byDay;
}

/** The XP total the app shows before a sync: the server's total plus the capped unsynced XP. */
export function optimisticXp(
  validatedXp: number,
  pending: Iterable<PendingXp>,
  rules: GameRules = DEFAULT_GAME_RULES,
): number {
  assertCount(validatedXp, 'validatedXp');
  let total = validatedXp;
  for (const xp of cappedPendingXp(pending, rules).values()) total += xp;
  return total;
}
