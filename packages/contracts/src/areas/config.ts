import { mvpRegistry, scoringConfigSchema, timingConfigSchema } from '@repo/quiz-engine';
import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import { appVersionSchema, httpsUrlSchema, isoTimestampSchema } from '../primitives.ts';
import { gameRulesSchema } from '../rules.ts';

// `GET /config`: remote config (spec §19.2, ADM-04). It serves every value the spec marks
// tunable, the feature flags and kill switches, and what forces an update. The app revalidates
// it with its ETag; a session keeps the values it started with (roadmap §7), which is why a
// session's snapshot carries its own copy of what it is scored with.

const flagNameSchema = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);

/** The most flags a config carries: a bound, so a config can't grow without limit. */
const maxFlags = 256;

export const configSchema = z.object({
  /** Changes whenever anything below does. It is also the response's ETag. */
  version: z.string().min(1).max(64),
  /** The server's clock when it answered: what the app measures its own clock against. */
  serverTime: isoTimestampSchema,
  /** Below this the app shows the forced-update screen, at the next safe moment (spec §21). */
  minAppVersion: z.object({ ios: appVersionSchema, android: appVersionSchema }),
  /** Where Update leads, when it isn't the store. */
  updateUrl: z.object({ ios: httpsUrlSchema.optional(), android: httpsUrlSchema.optional() }),
  /** Feature flags and kill switches, by name. A flag this build doesn't read is ignored. */
  flags: z
    .record(flagNameSchema, z.boolean())
    .refine((flags) => Object.keys(flags).length <= maxFlags, {
      error: `A config carries at most ${String(maxFlags)} flags.`,
    }),
  tunables: z.object({
    /** Spec §10.5. */
    scoring: scoringConfigSchema,
    /** Spec §10.3. */
    timing: timingConfigSchema,
    /** The tunables of each question type that has some, keyed by type. */
    questionTypes: mvpRegistry.tunablesSchema,
    /** Streaks, XP, levels and the daily goal (ADR 0004). */
    gameRules: gameRulesSchema,
  }),
});

/**
 * A config without its tunables: what forces an update and what switches a feature off. An app
 * reads this when the whole config won't parse, which is what happens when a newer server sends
 * a tunable or a question type the app's engine doesn't hold. The forced-update screen and the
 * kill switches must keep working in exactly that case.
 */
export const configCoreSchema = configSchema.omit({ tunables: true });

export type Config = z.infer<typeof configSchema>;
export type ConfigCore = z.infer<typeof configCoreSchema>;

export const getConfig = defineEndpoint({
  id: 'config.get',
  area: 'config',
  method: 'GET',
  path: '/config',
  access: 'public',
  summary: 'Remote config: tunables, flags, the minimum app version and server time.',
  params: null,
  query: null,
  body: null,
  idempotencyKey: false,
  caching: 'etag',
  success: { status: 200, body: configSchema },
  errors: [],
});
