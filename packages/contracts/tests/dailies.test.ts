import { describe, expect, it } from 'vitest';
import { dailySetSchema, getGlobalDailySet, globalSetParamsSchema } from '../src/areas/dailies.ts';
import { globalDailySetFixture, globalSetParamsFixture } from '../src/fixtures/dailies.ts';
import { globalDailySessionFixture } from '../src/fixtures/sessions.ts';
import { accepts, without } from './support.ts';

// The Global Daily's body is the same for everyone on a date and is served under a URL that
// names its date and content version, so it never changes (roadmap §4.3, §7).

describe('GET /daily/global/:date/:contentVersion', () => {
  it('is public and immutable, and its URL names the date and the version', () => {
    expect(getGlobalDailySet).toMatchObject({
      method: 'GET',
      path: '/daily/global/:date/:contentVersion',
      access: 'public',
      caching: 'immutable',
    });
    expect(getGlobalDailySet.errors).toEqual(['daily_not_available']);
    expect(globalSetParamsSchema.parse(globalSetParamsFixture)).toEqual(globalSetParamsFixture);
  });

  it('the daily set fixture parses, and its date and version are the endpoint’s params', () => {
    expect(dailySetSchema.parse(globalDailySetFixture)).toEqual(globalDailySetFixture);
    expect(globalDailySetFixture).toMatchObject(globalSetParamsFixture);
    expect(globalDailySetFixture.questions).toHaveLength(8);
  });

  it('a daily session points at exactly this body', () => {
    const session = globalDailySessionFixture;
    if (session.source !== 'global_daily') throw new Error('Expected a Global Daily session.');

    expect(
      globalSetParamsSchema.parse({ date: session.date, contentVersion: session.contentVersion }),
    ).toEqual(globalSetParamsFixture);
  });

  it('a body carries the rules it is scored with, its date and its version', () => {
    for (const field of ['rules', 'questions', 'date', 'contentVersion']) {
      expect(accepts(dailySetSchema, without(globalDailySetFixture, field)), field).toBe(false);
    }
  });

  it('a date that does not exist and a version that is no id are refused', () => {
    expect(accepts(globalSetParamsSchema, { date: '2026-11-31', contentVersion: 'v3' })).toBe(
      false,
    );
    expect(accepts(globalSetParamsSchema, { date: '2026-11-21', contentVersion: '../v3' })).toBe(
      false,
    );
  });
});
