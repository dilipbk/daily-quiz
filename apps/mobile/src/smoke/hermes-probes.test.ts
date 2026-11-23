import { describe, expect, it } from '@jest/globals';

import {
  probeArrayAt,
  probeDateTimeFormat,
  probeLocalDates,
  probeNormalize,
  probeObjectHasOwn,
  probeSharedFixtures,
  probeUnicodeRegex,
  probeZod,
} from './hermes-probes';

// These run on Node here, which proves the probes' own expectations are right.
// What they are for is the same code running on Hermes, in the smoke screen.
describe('hermes probes', () => {
  it('pass on a runtime that has every feature', () => {
    expect(probeUnicodeRegex()).toContain('\\p{L}');
    expect(probeObjectHasOwn()).toBe('own key true, inherited key false');
    expect(probeArrayAt()).toBe("at(-1) is 'c'");
    expect(probeNormalize()).toBe("'é' in NFD has length 2");
    expect(probeDateTimeFormat()).toBe('Kathmandu 01/02/2026, Los Angeles 12/31/2025');
    expect(probeZod()).toContain('strictObject');
  });

  it('dates the clock-change days and refuses unknown zones through game-rules', () => {
    expect(probeLocalDates()).toBe(
      '2026-01-02 2026-06-16 2026-03-07 2026-03-08 2026-03-08 2026-03-09 2026-10-31 2026-11-01 2026-11-01 2026-11-02; unknown zone: RangeError; empty zone: RangeError',
    );
  });

  it('runs every shared quiz-engine fixture without a failure', () => {
    expect(probeSharedFixtures()).toMatch(/^\d+ fixtures ran, 0 failed$/);
  });
});
