import { describe, expect, it } from 'vitest';
import { getProgress, progressQuerySchema, progressSchema } from '../src/areas/progress.ts';
import {
  firstDailyProgressFixture,
  frozenStreakProgressFixture,
  hundredDayStreakProgressFixture,
  newPlayerProgressFixture,
  progressQueryFixture,
} from '../src/fixtures/progress.ts';
import { accepts, withValue, without } from './support.ts';

// `GET /me/progress`: XP, level, streak, freezes and the daily goal (spec §19.3). The server is
// the authority for all of them (STK-02).

const withStreak = (change: object): unknown =>
  withValue(firstDailyProgressFixture, 'streak', {
    ...firstDailyProgressFixture.streak,
    ...change,
  });

const withXp = (change: object): unknown =>
  withValue(firstDailyProgressFixture, 'xp', { ...firstDailyProgressFixture.xp, ...change });

describe('GET /me/progress', () => {
  it('needs a player session and the device’s zone', () => {
    expect(getProgress).toMatchObject({ method: 'GET', path: '/me/progress', access: 'player' });
    expect(progressQuerySchema.parse(progressQueryFixture)).toEqual(progressQueryFixture);
    expect(accepts(progressQuerySchema, {})).toBe(false);
    expect(accepts(progressQuerySchema, { timeZone: 'Asia/Kathmandu', playerId: 'p2' })).toBe(
      false,
    );
  });

  it('progress parses for a new player, a first day, a hundred days and a frozen streak', () => {
    for (const progress of [
      newPlayerProgressFixture,
      firstDailyProgressFixture,
      hundredDayStreakProgressFixture,
      frozenStreakProgressFixture,
    ]) {
      expect(progressSchema.parse(progress)).toEqual(progress);
    }
  });

  it('says which date it took as today, and when', () => {
    expect(accepts(progressSchema, without(firstDailyProgressFixture, 'asOfDate'))).toBe(false);
    expect(accepts(progressSchema, without(firstDailyProgressFixture, 'serverTime'))).toBe(false);
  });

  it('counts are whole and never negative', () => {
    for (const bad of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '22', null]) {
      expect(accepts(progressSchema, withXp({ total: bad })), String(bad)).toBe(false);
      expect(accepts(progressSchema, withStreak({ current: bad })), String(bad)).toBe(false);
      expect(accepts(progressSchema, withStreak({ freezesHeld: bad })), String(bad)).toBe(false);
    }
  });

  it('a level starts at 1', () => {
    expect(accepts(progressSchema, withValue(firstDailyProgressFixture, 'level', 0))).toBe(false);
    expect(accepts(progressSchema, withValue(firstDailyProgressFixture, 'level', 1.5))).toBe(false);
  });

  it('a streak status outside the four is refused', () => {
    for (const status of ['inactive', 'lit', 'at_risk', 'frozen']) {
      expect(accepts(progressSchema, withStreak({ status })), status).toBe(true);
    }
    expect(accepts(progressSchema, withStreak({ status: 'broken' }))).toBe(false);
  });

  it('a goal is a tier and its target', () => {
    const withGoal = (dailyGoal: object) =>
      withValue(firstDailyProgressFixture, 'dailyGoal', dailyGoal);

    expect(accepts(progressSchema, withGoal({ tier: 'serious', target: 100 }))).toBe(true);
    expect(accepts(progressSchema, withGoal({ tier: 'heroic', target: 100 }))).toBe(false);
    expect(accepts(progressSchema, withGoal({ tier: 'serious', target: 0 }))).toBe(false);
  });
});
