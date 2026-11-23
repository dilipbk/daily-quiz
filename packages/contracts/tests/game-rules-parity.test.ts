import {
  DEFAULT_GAME_RULES,
  type DailyGoalTier,
  type GameRules,
  type PlayMode,
  type SessionSource,
  type StreakStatus,
} from '@repo/game-rules';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as z from 'zod';
import { streakStatusSchema } from '../src/areas/progress.ts';
import { gameRulesFixture } from '../src/fixtures/config.ts';
import {
  dailyGoalTierSchema,
  gameRulesSchema,
  playModeSchema,
  sessionSourceSchema,
} from '../src/rules.ts';

// `packages/game-rules` owns the rules and the lists it switches on (ADR 0004). It exports them
// as types, and a schema is a value, so `src` writes each one out again. These tests are what
// ties a copy to its original: `toEqualTypeOf` holds only when two types are the same, so a
// member or a field that is added, dropped, renamed, retyped or made optional on either side
// stops `pnpm typecheck`. When that happens, this package is the one to change.

/**
 * A type with `readonly` taken off every property and array, all the way down.
 *
 * game-rules marks its rules `readonly`: its functions promise not to change what they are
 * handed. A schema's output is a new object that its caller owns, so zod infers it without the
 * mark. `readonly` says who may write and nothing about what is on the wire, so the comparison
 * leaves it out on both sides.
 */
type Writable<T> = T extends readonly (infer Item)[]
  ? Writable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Writable<T[Key]> }
    : T;

describe('the shapes copied from game-rules', () => {
  it('the rules have the same groups and fields, `readonly` aside', () => {
    expectTypeOf<Writable<z.infer<typeof gameRulesSchema>>>().toEqualTypeOf<Writable<GameRules>>();
  });

  // The direction the API and the app use, with nothing taken off: parse a config, then compute.
  it('rules the schema has parsed go to game-rules as they are', () => {
    expectTypeOf<z.infer<typeof gameRulesSchema>>().toExtend<GameRules>();
  });

  it('a session source is one of the same four', () => {
    expectTypeOf<z.infer<typeof sessionSourceSchema>>().toEqualTypeOf<SessionSource>();
  });

  it('a play mode is one of the same three', () => {
    expectTypeOf<z.infer<typeof playModeSchema>>().toEqualTypeOf<PlayMode>();
  });

  it('a daily goal tier is one of the same three', () => {
    expectTypeOf<z.infer<typeof dailyGoalTierSchema>>().toEqualTypeOf<DailyGoalTier>();
  });

  it('a streak status is one of the same four', () => {
    expectTypeOf<z.infer<typeof streakStatusSchema>>().toEqualTypeOf<StreakStatus>();
  });
});

describe('the default rules', () => {
  // The schema drops a key it doesn't name, so a rule game-rules gained and this package didn't
  // would go missing here as well as in the type check above.
  it('the schema accepts the defaults game-rules ships with and changes nothing', () => {
    expect(gameRulesSchema.parse(DEFAULT_GAME_RULES)).toStrictEqual(DEFAULT_GAME_RULES);
  });

  it('the fixture is those defaults', () => {
    expect(gameRulesFixture).toStrictEqual(DEFAULT_GAME_RULES);
  });
});
