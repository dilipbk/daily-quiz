import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import {
  appVersionSchema,
  idSchema,
  isoTimestampSchema,
  localeSchema,
  platformSchema,
  timeZoneSchema,
} from '../primitives.ts';
import { dailyGoalTierSchema } from '../rules.ts';

// Identity (spec §19.3, roadmap §4.3). Most players never sign in, so the guest account is the
// account. These shapes are v0 and provisional until BE-03 has run Better Auth on a device
// (ADR 0024): sign-in, linking and deletion arrive with their own tickets.

/**
 * A device's credential. The device makes both values once, at first launch, and keeps them in
 * its secure store. `deviceId` names the device and is no secret; `deviceSecret` is 256 bits or
 * more from a secure random source, written in base64url.
 */
export const guestRequestSchema = z.strictObject({
  deviceId: idSchema,
  deviceSecret: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
});

/** A server-side session. The app keeps the token in its secure store and sends it as a bearer. */
const sessionTokenSchema = z.object({
  token: z.string().min(16).max(512),
  expiresAt: isoTimestampSchema,
});

export const guestResponseSchema = z.object({
  /** Our own id for the player. All game data is keyed to it, never to the auth library's id. */
  playerId: idSchema,
  /** Whether this call created the player, or found the one this device already has. */
  isNew: z.boolean(),
  session: sessionTokenSchema,
  serverTime: isoTimestampSchema,
});

export const playerSchema = z.object({
  playerId: idSchema,
  /** `guest` until the player links Apple, Google or an email address. */
  kind: z.enum(['guest', 'registered']),
  dailyGoal: dailyGoalTierSchema,
  createdAt: isoTimestampSchema,
});

export const updatePlayerSchema = z.strictObject({
  dailyGoal: dailyGoalTierSchema,
});

export const deviceParamsSchema = z.strictObject({ deviceId: idSchema });

/** What a device tells the server about itself, sent whole each time something changes. */
export const deviceSchema = z.strictObject({
  platform: platformSchema,
  appVersion: appVersionSchema,
  /** The app's language. */
  locale: localeSchema,
  timeZone: timeZoneSchema,
  /** `null` until the player has allowed notifications (NTF-01). */
  pushToken: z.string().min(1).max(4096).nullable(),
});

export type GuestRequest = z.infer<typeof guestRequestSchema>;
export type GuestResponse = z.infer<typeof guestResponseSchema>;
export type Player = z.infer<typeof playerSchema>;
export type UpdatePlayer = z.infer<typeof updatePlayerSchema>;
export type Device = z.infer<typeof deviceSchema>;

/**
 * Get-or-create. The first call with a credential creates the guest player; any later call with
 * the same credential finds that player and starts a new session, so an expired session never
 * orphans a streak, and a retry after a lost response makes no second player. A known device id
 * with another secret is refused.
 */
export const authGuest = defineEndpoint({
  id: 'auth.guest',
  area: 'identity',
  method: 'POST',
  path: '/auth/guest',
  access: 'public',
  summary: 'Create the guest player for a device, or start a new session for it.',
  params: null,
  query: null,
  body: guestRequestSchema,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: guestResponseSchema },
  errors: ['device_credential_invalid'],
});

export const getMe = defineEndpoint({
  id: 'me.get',
  area: 'identity',
  method: 'GET',
  path: '/me',
  access: 'player',
  summary: 'The signed-in player.',
  params: null,
  query: null,
  body: null,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: playerSchema },
  errors: [],
});

export const updateMe = defineEndpoint({
  id: 'me.update',
  area: 'identity',
  method: 'PATCH',
  path: '/me',
  access: 'player',
  summary: "Change the player's daily goal.",
  params: null,
  query: null,
  body: updatePlayerSchema,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 200, body: playerSchema },
  errors: [],
});

export const putDevice = defineEndpoint({
  id: 'devices.put',
  area: 'identity',
  method: 'PUT',
  path: '/devices/:deviceId',
  access: 'player',
  summary: 'Register this device, or replace what the server knows about it.',
  params: deviceParamsSchema,
  query: null,
  body: deviceSchema,
  idempotencyKey: false,
  caching: 'none',
  success: { status: 204, body: null },
  errors: ['forbidden'],
});
