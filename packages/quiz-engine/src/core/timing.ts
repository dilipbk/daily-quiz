import * as z from 'zod';
import type { TimeClass } from './module.ts';

// The Standard time limit of a question (spec §10.3): what the speed bonus is measured against,
// whatever time setting the player chose (D13). A type declares a time class, not a number of
// seconds, so a new type needs no entry in anyone's table. The server calls this once when it
// builds a session and stores the result in the snapshot.

export interface TimingConfig {
  /** For types where the player picks an answer. */
  readonly choiceMs: number;
  /** For types where the player constructs one: typing, ordering. */
  readonly constructedMs: number;
  /** Added when the question contains media or math. */
  readonly mediaBonusMs: number;
}

const limitMs = z.int().positive();

export const timingConfigSchema: z.ZodType<TimingConfig> = z.strictObject({
  choiceMs: limitMs,
  constructedMs: limitMs,
  // Zero is a config with no media bonus. A limit of zero is no question at all.
  mediaBonusMs: z.int().nonnegative(),
});

/** The §10.3 values: 20 s, 30 s and +10 s. */
export const specTimingConfig: TimingConfig = Object.freeze({
  choiceMs: 20_000,
  constructedMs: 30_000,
  mediaBonusMs: 10_000,
});

export function standardLimitMs(
  timeClass: TimeClass,
  hasMediaOrMath: boolean,
  config: TimingConfig,
): number {
  const limits: Record<TimeClass, number> = {
    choice: config.choiceMs,
    constructed: config.constructedMs,
  };
  return limits[timeClass] + (hasMediaOrMath ? config.mediaBonusMs : 0);
}
