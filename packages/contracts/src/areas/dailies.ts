import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import { idSchema, localDateSchema } from '../primitives.ts';
import { questionSetSchema } from '../questions.ts';

// The Global Daily (DLY-01, roadmap §4.3). Its body is the same for every player on a date: it is
// built once and served from the CDN under a URL that names the date and the content version, so
// it never changes and is never purged (roadmap §7). A player's own session (see ./sessions.ts)
// holds the content version and no questions, and the app fetches this body once per version.

/** Which body: the daily's date, and the version of its content that a session is pinned to. */
export const globalSetParamsSchema = z.strictObject({
  date: localDateSchema,
  contentVersion: idSchema,
});

/**
 * A daily's immutable snapshot: the questions with their keys (Tier B, spec §10.1), the values
 * each is scored with, and the rules the set was built under.
 */
export const dailySetSchema = questionSetSchema.extend({
  date: localDateSchema,
  contentVersion: idSchema,
});

export type DailySet = z.infer<typeof dailySetSchema>;

export const getGlobalDailySet = defineEndpoint({
  id: 'dailies.globalSet',
  area: 'dailies',
  method: 'GET',
  path: '/daily/global/:date/:contentVersion',
  access: 'public',
  summary: 'The Global Daily of a date, at one content version.',
  params: globalSetParamsSchema,
  query: null,
  body: null,
  idempotencyKey: false,
  caching: 'immutable',
  success: { status: 200, body: dailySetSchema },
  errors: ['daily_not_available'],
});
