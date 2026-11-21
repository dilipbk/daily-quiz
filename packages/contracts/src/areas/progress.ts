import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import {
  countSchema,
  isoTimestampSchema,
  localDateSchema,
  queryIntegerSchema,
  timeZoneSchema,
} from '../primitives.ts';
import { dailyGoalTierSchema } from '../rules.ts';

// A player's progress (spec §19.3): XP, level, streak, freezes and the daily goal. The server is
// the authority (STK-02); the app shows its own optimistic figures until this arrives.

/**
 * As `StreakStatus` in packages/game-rules: no streak; today is credited; alive but today is not
 * credited yet; and the same with a freeze having covered yesterday.
 */
export const streakStatusSchema = z.enum(['inactive', 'lit', 'at_risk', 'frozen']);

/**
 * Where the device is now: a streak's state depends on what "today" is for the player. The
 * offset travels with the zone, as it does in a completion, for a zone the server doesn't know.
 */
export const progressQuerySchema = z.strictObject({
  timeZone: timeZoneSchema,
  utcOffsetMinutes: queryIntegerSchema(-720, 840),
});

export const progressSchema = z.object({
  serverTime: isoTimestampSchema,
  /** The calendar date the server took as the player's today when it worked this out. */
  asOfDate: localDateSchema,
  xp: z.object({
    total: countSchema,
    /** XP credited to `asOfDate`, whatever mode earned it: what fills the goal ring (XP-03). */
    today: countSchema,
  }),
  level: z.int().min(1).max(1_000_000),
  streak: z.object({
    current: countSchema,
    /** A high-water mark: it only rises (ADR 0004). */
    best: countSchema,
    freezesHeld: countSchema,
    status: streakStatusSchema,
    lastCreditedDate: localDateSchema.nullable(),
  }),
  dailyGoal: z.object({
    tier: dailyGoalTierSchema,
    /** The tier's XP target under the rules in force. */
    target: z.int().min(1).max(1_000_000),
  }),
});

export type StreakStatus = z.infer<typeof streakStatusSchema>;
export type Progress = z.infer<typeof progressSchema>;

export const getProgress = defineEndpoint({
  id: 'progress.get',
  area: 'progress',
  method: 'GET',
  path: '/me/progress',
  access: 'player',
  summary: "The player's XP, level, streak, freezes and daily goal.",
  params: null,
  query: progressQuerySchema,
  body: null,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: progressSchema },
  errors: [],
});
