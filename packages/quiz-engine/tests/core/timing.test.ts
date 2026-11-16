import { describe, expect, it } from 'vitest';
import type { TimeClass } from '../../src/core/module.ts';
import { specTimingConfig, standardLimitMs, timingConfigSchema } from '../../src/core/timing.ts';

describe('standardLimitMs', () => {
  it('§10.3 the Standard limit is 20 s for choice types, 30 s for constructed answers, +10 s with media or math', () => {
    expect(standardLimitMs('choice', false, specTimingConfig)).toBe(20_000);
    expect(standardLimitMs('constructed', false, specTimingConfig)).toBe(30_000);
    expect(standardLimitMs('choice', true, specTimingConfig)).toBe(30_000);
    expect(standardLimitMs('constructed', true, specTimingConfig)).toBe(40_000);
  });

  it('every value comes from the config', () => {
    const config = { choiceMs: 1, constructedMs: 2, mediaBonusMs: 4 };

    expect(standardLimitMs('choice', false, config)).toBe(1);
    expect(standardLimitMs('constructed', false, config)).toBe(2);
    expect(standardLimitMs('choice', true, config)).toBe(5);
    expect(standardLimitMs('constructed', true, config)).toBe(6);
  });

  it('refuses a time class that is not one of its own, a name every object inherits included', () => {
    const others = [
      'constructor',
      'toString',
      'hasOwnProperty',
      '__proto__',
      'Choice',
      'media',
      '',
    ];

    for (const name of others) {
      for (const hasMediaOrMath of [false, true]) {
        expect(
          () => standardLimitMs(name as TimeClass, hasMediaOrMath, specTimingConfig),
          name,
        ).toThrow(RangeError);
      }
    }
    expect(() =>
      standardLimitMs(undefined as unknown as TimeClass, false, specTimingConfig),
    ).toThrow(RangeError);
  });

  it('§10.3 the spec values exist once, as data that passes its own schema', () => {
    expect(specTimingConfig).toEqual({
      choiceMs: 20_000,
      constructedMs: 30_000,
      mediaBonusMs: 10_000,
    });
    expect(timingConfigSchema.parse(specTimingConfig)).toEqual(specTimingConfig);
    expect(Object.isFrozen(specTimingConfig)).toBe(true);
  });

  it('timingConfigSchema refuses negative and fractional values, and a limit of zero', () => {
    for (const field of ['choiceMs', 'constructedMs', 'mediaBonusMs']) {
      for (const value of [-1, 1_000.5, Number.NaN, Number.POSITIVE_INFINITY, '20000']) {
        const config = { ...specTimingConfig, [field]: value };

        expect(timingConfigSchema.safeParse(config).success, JSON.stringify(config)).toBe(false);
      }
    }
    for (const field of ['choiceMs', 'constructedMs']) {
      const config = { ...specTimingConfig, [field]: 0 };

      expect(timingConfigSchema.safeParse(config).success, JSON.stringify(config)).toBe(false);
    }
    expect(timingConfigSchema.safeParse({ ...specTimingConfig, extendedMs: 40_000 }).success).toBe(
      false,
    );
    expect(timingConfigSchema.safeParse({ choiceMs: 20_000 }).success).toBe(false);
  });

  it('timingConfigSchema accepts a media bonus of 0: a config with no media bonus', () => {
    const config = { ...specTimingConfig, mediaBonusMs: 0 };

    expect(timingConfigSchema.parse(config)).toEqual(config);
    expect(standardLimitMs('choice', true, config)).toBe(20_000);
    expect(standardLimitMs('constructed', true, config)).toBe(30_000);
  });
});
