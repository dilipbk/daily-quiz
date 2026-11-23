import { describe, expect, it } from 'vitest';
import { configCoreSchema, configSchema, getConfig } from '../src/areas/config.ts';
import { configFixture } from '../src/fixtures/config.ts';
import { without } from './support.ts';

// `GET /config` serves every value the spec marks tunable, the flags, and what forces an update
// (spec §19.2, ADM-04). The engine's own schemas guard its tunables; they are embedded here.

/** The fixture with one tunables group replaced. */
const withTunables = (group: string, value: unknown): unknown => ({
  ...configFixture,
  tunables: { ...configFixture.tunables, [group]: value },
});

const refuses = (value: unknown) => !configSchema.safeParse(value).success;

describe('GET /config', () => {
  it('the config fixture parses', () => {
    expect(configSchema.parse(configFixture)).toEqual(configFixture);
  });

  it('is public and revalidated with its ETag', () => {
    expect(getConfig).toMatchObject({
      id: 'config.get',
      method: 'GET',
      path: '/config',
      access: 'public',
      caching: 'etag',
    });
    expect(getConfig.success.body).toBe(configSchema);
  });

  it('carries server time, so the app can measure its clock against it', () => {
    expect(refuses(without(configFixture, 'serverTime'))).toBe(true);
  });

  it('a scoring config the engine refuses is refused here', () => {
    const { scoring } = configFixture.tunables;
    const upsideDown = {
      ...scoring,
      difficulty: { ...scoring.difficulty, minRating: 1800, maxRating: 1200 },
    };

    expect(refuses(withTunables('scoring', upsideDown))).toBe(true);
    expect(refuses(withTunables('scoring', { ...scoring, comboStep: -10 }))).toBe(true);
  });

  it('a timing config with a limit of zero is refused', () => {
    expect(refuses(withTunables('timing', { ...configFixture.tunables.timing, choiceMs: 0 }))).toBe(
      true,
    );
  });

  it('a tunable for a type the engine does not hold is refused', () => {
    const { questionTypes } = configFixture.tunables;

    expect(refuses(withTunables('questionTypes', { ...questionTypes, hotspot: {} }))).toBe(true);
    expect(refuses(withTunables('questionTypes', {}))).toBe(true);
  });

  it('game rules that would reach a ledger as NaN are refused', () => {
    const { gameRules } = configFixture.tunables;

    expect(refuses(withTunables('gameRules', { ...gameRules, levels: { stepXp: 0 } }))).toBe(true);
  });

  it('an update URL is optional per platform, and must be https', () => {
    expect(refuses({ ...configFixture, updateUrl: {} })).toBe(false);
    expect(
      refuses({ ...configFixture, updateUrl: { android: 'http://example.org/app.apk' } }),
    ).toBe(true);
    expect(refuses({ ...configFixture, updateUrl: { ios: 'itms-apps://example' } })).toBe(true);
  });

  it('a flag is a snake-case name and a boolean', () => {
    expect(refuses({ ...configFixture, flags: {} })).toBe(false);
    expect(refuses({ ...configFixture, flags: { daily_5: 'on' } })).toBe(true);
    expect(refuses({ ...configFixture, flags: { 'Daily 5': true } })).toBe(true);
  });

  it('a field added by a newer server is dropped, not refused', () => {
    const parsed = configSchema.parse({ ...configFixture, dailySets: { today: 'v7' } });

    expect(parsed).toEqual(configFixture);
  });

  // The engine's schemas are strict, so a tunable this build doesn't hold fails the whole config.
  // The forced-update screen and the kill switches have to work in exactly that case.
  it('an app that cannot read a newer server’s tunables can still read the minimum version and the flags', () => {
    const { questionTypes } = configFixture.tunables;
    const fromANewerServer = withTunables('questionTypes', { ...questionTypes, hotspot: {} });

    expect(refuses(fromANewerServer)).toBe(true);
    expect(configCoreSchema.parse(fromANewerServer)).toEqual(without(configFixture, 'tunables'));
    expect(configCoreSchema.parse({ ...configFixture, tunables: 'unreadable' })).toMatchObject({
      minAppVersion: configFixture.minAppVersion,
      flags: configFixture.flags,
    });
  });
});
