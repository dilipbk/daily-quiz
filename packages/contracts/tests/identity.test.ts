import { describe, expect, it } from 'vitest';
import {
  authGuest,
  deviceSchema,
  getMe,
  guestRequestSchema,
  guestResponseSchema,
  playerSchema,
  putDevice,
  updateMe,
  updatePlayerSchema,
} from '../src/areas/identity.ts';
import {
  deviceFixture,
  guestRequestFixture,
  guestResponseFixture,
  playerFixture,
} from '../src/fixtures/identity.ts';
import { accepts, withValue, without } from './support.ts';

// Guest identity (roadmap §4.3, ONB-02): the guest account is the account, and a device-held
// secret can start a new session at any time. Provisional until BE-03 (ADR 0024).

describe('POST /auth/guest', () => {
  it('is public, and takes the device credential', () => {
    expect(authGuest).toMatchObject({ method: 'POST', path: '/auth/guest', access: 'public' });
    expect(authGuest.body).toBe(guestRequestSchema);
    expect(authGuest.errors).toEqual(['device_credential_invalid']);
    expect(guestRequestSchema.parse(guestRequestFixture)).toEqual(guestRequestFixture);
  });

  it('a device secret shorter than 43 characters is refused', () => {
    const secretOf = (length: number) =>
      withValue(guestRequestFixture, 'deviceSecret', 'a'.repeat(length));

    expect(accepts(guestRequestSchema, secretOf(43))).toBe(true);
    expect(accepts(guestRequestSchema, secretOf(42))).toBe(false);
    expect(accepts(guestRequestSchema, secretOf(129))).toBe(false);
    expect(accepts(guestRequestSchema, withValue(guestRequestFixture, 'deviceSecret', ''))).toBe(
      false,
    );
  });

  it('a guest request refuses an extra field and needs both values', () => {
    expect(accepts(guestRequestSchema, { ...guestRequestFixture, playerId: 'player-0002' })).toBe(
      false,
    );
    expect(accepts(guestRequestSchema, without(guestRequestFixture, 'deviceId'))).toBe(false);
    expect(accepts(guestRequestSchema, without(guestRequestFixture, 'deviceSecret'))).toBe(false);
  });

  it('the response names our player id, a session and server time', () => {
    expect(guestResponseSchema.parse(guestResponseFixture)).toEqual(guestResponseFixture);
    for (const field of ['playerId', 'session', 'serverTime', 'isNew']) {
      expect(accepts(guestResponseSchema, without(guestResponseFixture, field)), field).toBe(false);
    }
  });

  it('the response never echoes the secret back', () => {
    const echoed = { ...guestResponseFixture, deviceSecret: guestRequestFixture.deviceSecret };

    expect(guestResponseSchema.parse(echoed)).toEqual(guestResponseFixture);
  });
});

describe('/me', () => {
  it('reading and changing the player need a player session', () => {
    expect(getMe).toMatchObject({ method: 'GET', path: '/me', access: 'player' });
    expect(updateMe).toMatchObject({ method: 'PATCH', path: '/me', access: 'player' });
    expect(playerSchema.parse(playerFixture)).toEqual(playerFixture);
  });

  it('a daily goal is one of the three tiers', () => {
    expect(accepts(updatePlayerSchema, { dailyGoal: 'casual' })).toBe(true);
    expect(accepts(updatePlayerSchema, { dailyGoal: 'heroic' })).toBe(false);
    expect(accepts(updatePlayerSchema, {})).toBe(false);
    expect(accepts(updatePlayerSchema, { dailyGoal: 'casual', kind: 'registered' })).toBe(false);
  });
});

describe('PUT /devices/:deviceId', () => {
  it('answers with no body', () => {
    expect(putDevice).toMatchObject({
      method: 'PUT',
      path: '/devices/:deviceId',
      access: 'player',
    });
    expect(putDevice.success).toEqual({ status: 204, body: null });
  });

  it('a device says its platform, version, language, zone and push token', () => {
    expect(deviceSchema.parse(deviceFixture)).toEqual(deviceFixture);
    expect(accepts(deviceSchema, { ...deviceFixture, pushToken: 'ExponentPushToken[abc]' })).toBe(
      true,
    );

    expect(accepts(deviceSchema, without(deviceFixture, 'pushToken'))).toBe(false);
    expect(accepts(deviceSchema, { ...deviceFixture, platform: 'windows' })).toBe(false);
    expect(accepts(deviceSchema, { ...deviceFixture, appVersion: '1.0' })).toBe(false);
    expect(accepts(deviceSchema, { ...deviceFixture, timeZone: '' })).toBe(false);
  });
});
