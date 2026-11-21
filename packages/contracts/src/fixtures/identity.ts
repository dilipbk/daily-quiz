import type {
  Device,
  GuestRequest,
  GuestResponse,
  Player,
  UpdatePlayer,
} from '../areas/identity.ts';

// The secret and the token below are fixtures, spelled so that nobody mistakes them for real ones.

export const guestRequestFixture: GuestRequest = {
  deviceId: '0193a1b2-7c3d-7e4f-8a5b-6c7d8e9f0a1b',
  deviceSecret: 'fixture-device-secret-not-a-real-credential-0000',
};

export const guestResponseFixture: GuestResponse = {
  playerId: 'player-0001',
  isNew: true,
  session: {
    token: 'fixture-session-token-not-a-real-credential',
    expiresAt: '2026-12-21T18:03:11.482Z',
  },
  serverTime: '2026-11-21T18:03:11.482Z',
};

/** A new guest, on the goal a new player starts with. */
export const playerFixture: Player = {
  playerId: 'player-0001',
  kind: 'guest',
  dailyGoal: 'regular',
  createdAt: '2026-11-21T18:03:11.482Z',
};

export const updatePlayerFixture: UpdatePlayer = { dailyGoal: 'serious' };

/** The same player after `updatePlayerFixture`. */
export const updatedPlayerFixture: Player = { ...playerFixture, dailyGoal: 'serious' };

export const deviceParamsFixture = { deviceId: guestRequestFixture.deviceId };

/** A phone in Kathmandu that has not been asked about notifications yet. */
export const deviceFixture: Device = {
  platform: 'android',
  appVersion: '1.0.0',
  locale: 'en',
  timeZone: 'Asia/Kathmandu',
  pushToken: null,
};
