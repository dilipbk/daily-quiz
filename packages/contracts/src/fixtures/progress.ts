import type { Progress } from '../areas/progress.ts';

// Progress in the states the fake server's scenarios need (spec §19.6). Levels follow ADR 0004:
// reaching level L takes 20 × L × (L − 1) / 2 XP, so 22 XP is level 2 and 4,812 XP is level 22.

/** The parsed form of `?timeZone=Asia/Kathmandu&utcOffsetMinutes=345`. */
export const progressQueryFixture = { timeZone: 'Asia/Kathmandu', utcOffsetMinutes: 345 };

/** A guest who has not played yet. */
export const newPlayerProgressFixture: Progress = {
  serverTime: '2026-11-21T12:09:58.004Z',
  asOfDate: '2026-11-21',
  xp: { total: 0, today: 0 },
  level: 1,
  streak: { current: 0, best: 0, freezesHeld: 0, status: 'inactive', lastCreditedDate: null },
  dailyGoal: { tier: 'regular', target: 50 },
};

/** The same player after a first Global Daily with six of eight right: 10 + 2 × 6 XP. */
export const firstDailyProgressFixture: Progress = {
  serverTime: '2026-11-21T12:13:23.371Z',
  asOfDate: '2026-11-21',
  xp: { total: 22, today: 22 },
  level: 2,
  streak: { current: 1, best: 1, freezesHeld: 0, status: 'lit', lastCreditedDate: '2026-11-21' },
  dailyGoal: { tier: 'regular', target: 50 },
};

/** A hundred days in a row, today's included, holding both freezes. */
export const hundredDayStreakProgressFixture: Progress = {
  serverTime: '2026-11-21T12:13:23.371Z',
  asOfDate: '2026-11-21',
  xp: { total: 4812, today: 44 },
  level: 22,
  streak: {
    current: 100,
    best: 100,
    freezesHeld: 2,
    status: 'lit',
    lastCreditedDate: '2026-11-21',
  },
  dailyGoal: { tier: 'serious', target: 100 },
};

/** Yesterday was missed and a freeze covered it; today is not played yet. */
export const frozenStreakProgressFixture: Progress = {
  serverTime: '2026-11-21T03:40:10.905Z',
  asOfDate: '2026-11-21',
  xp: { total: 610, today: 0 },
  level: 8,
  streak: {
    current: 12,
    best: 31,
    freezesHeld: 0,
    status: 'frozen',
    lastCreditedDate: '2026-11-19',
  },
  dailyGoal: { tier: 'casual', target: 20 },
};
