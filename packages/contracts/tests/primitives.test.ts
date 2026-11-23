import { describe, expect, it } from 'vitest';
import {
  appVersionSchema,
  httpsUrlSchema,
  idSchema,
  isoTimestampSchema,
  localDateSchema,
  localeSchema,
  pageOf,
  pageQueryShape,
  queryIntegerSchema,
  slugSchema,
  timeZoneSchema,
  utcOffsetMinutesSchema,
} from '../src/primitives.ts';

// The values every contract is built from (spec §19.2): ids, UTC timestamps, calendar dates,
// the device's time zone and its offset, and cursor pagination.

const accepts = (schema: { safeParse: (value: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('timestamps and dates', () => {
  it('a timestamp must be UTC with a Z', () => {
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11.123Z')).toBe(true);
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11.000Z')).toBe(true);

    expect(accepts(isoTimestampSchema, '2026-11-21T23:48:11+05:45')).toBe(false);
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03Z')).toBe(false);
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11')).toBe(false);
    expect(accepts(isoTimestampSchema, 1_795_284_191_000)).toBe(false);
  });

  it('a timestamp has one spelling, to the millisecond, so two compare as strings', () => {
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11Z')).toBe(false);
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11.1Z')).toBe(false);
    expect(accepts(isoTimestampSchema, '2026-11-21T18:03:11.123456Z')).toBe(false);

    const inOrder = [
      '2026-11-21T18:03:11.900Z',
      '2026-11-21T18:03:12.000Z',
      '2026-12-01T00:00:00.000Z',
    ];
    expect([...inOrder].reverse().sort()).toEqual(inOrder);
  });

  it('a date must exist', () => {
    expect(accepts(localDateSchema, '2026-11-21')).toBe(true);
    expect(accepts(localDateSchema, '2028-02-29')).toBe(true);

    expect(accepts(localDateSchema, '2026-02-30')).toBe(false);
    expect(accepts(localDateSchema, '2026-02-29')).toBe(false);
    expect(accepts(localDateSchema, '2026-11-21T00:00:00Z')).toBe(false);
    expect(accepts(localDateSchema, '21-11-2026')).toBe(false);
  });
});

describe('where the device is', () => {
  it('an offset runs from −720 to +840', () => {
    // Kathmandu, the Chatham Islands in winter, and Kiritimati: the largest offset in use.
    for (const offset of [345, 765, 840, 0, -720, -210]) {
      expect(accepts(utcOffsetMinutesSchema, offset), String(offset)).toBe(true);
    }
    for (const offset of [841, -721, 5.5, Number.NaN, Number.POSITIVE_INFINITY, '345', null]) {
      expect(accepts(utcOffsetMinutesSchema, offset), String(offset)).toBe(false);
    }
  });

  it('a time zone is an IANA id', () => {
    for (const zone of [
      'Asia/Kathmandu',
      'America/Argentina/Buenos_Aires',
      'America/Port-au-Prince',
      'Etc/GMT+12',
      'UTC',
    ]) {
      expect(accepts(timeZoneSchema, zone), zone).toBe(true);
    }
    for (const zone of [
      '',
      'Asia/ Kathmandu',
      '/Asia',
      'Asia/',
      'Asia//Kathmandu',
      'a'.repeat(65),
    ]) {
      expect(accepts(timeZoneSchema, zone), zone).toBe(false);
    }
  });

  it('a zone this build has never heard of still parses: the offset is the fallback', () => {
    expect(accepts(timeZoneSchema, 'America/Coyhaique')).toBe(true);
    expect(accepts(timeZoneSchema, 'Antarctica/Not_Yet_Named')).toBe(true);
  });
});

describe('ids and names', () => {
  it('an id is 1 to 64 URL-safe characters', () => {
    expect(accepts(idSchema, '0193a1b2-7c3d-7e4f-8a5b-6c7d8e9f0a1b')).toBe(true);
    expect(accepts(idSchema, 'q_1')).toBe(true);

    expect(accepts(idSchema, '')).toBe(false);
    expect(accepts(idSchema, 'a/b')).toBe(false);
    expect(accepts(idSchema, '../etc')).toBe(false);
    expect(accepts(idSchema, 'x'.repeat(65))).toBe(false);
  });

  it('a slug is lowercase words joined by single hyphens', () => {
    expect(accepts(slugSchema, 'math-logic')).toBe(true);
    expect(accepts(slugSchema, 'science')).toBe(true);

    expect(accepts(slugSchema, 'Math')).toBe(false);
    expect(accepts(slugSchema, 'math--logic')).toBe(false);
    expect(accepts(slugSchema, '-math')).toBe(false);
  });

  it('a locale is a BCP 47 tag', () => {
    expect(accepts(localeSchema, 'en')).toBe(true);
    expect(accepts(localeSchema, 'pt-BR')).toBe(true);
    expect(accepts(localeSchema, 'zh-Hant-TW')).toBe(true);

    expect(accepts(localeSchema, 'english')).toBe(false);
    expect(accepts(localeSchema, 'en_US')).toBe(false);
  });

  it('an app version is three numbers', () => {
    expect(accepts(appVersionSchema, '1.4.0')).toBe(true);
    expect(accepts(appVersionSchema, '1.4')).toBe(false);
    expect(accepts(appVersionSchema, 'v1.4.0')).toBe(false);
    expect(accepts(appVersionSchema, '1.4.0-beta.1')).toBe(false);
  });

  it('an https URL only', () => {
    expect(accepts(httpsUrlSchema, 'https://cdn.example.org/a/b.webp')).toBe(true);

    expect(accepts(httpsUrlSchema, 'http://cdn.example.org/a.webp')).toBe(false);
    expect(accepts(httpsUrlSchema, 'https://cdn.example.org:8443/a.webp')).toBe(false);
    expect(accepts(httpsUrlSchema, 'javascript:alert(1)')).toBe(false);
    expect(accepts(httpsUrlSchema, '/relative/path')).toBe(false);
  });
});

describe('cursor pagination', () => {
  const pageSchema = pageOf(idSchema);

  it('a page is items and the cursor of the next one, or null on the last', () => {
    expect(pageSchema.parse({ items: ['a', 'b'], nextCursor: 'c2' })).toEqual({
      items: ['a', 'b'],
      nextCursor: 'c2',
    });
    expect(accepts(pageSchema, { items: [], nextCursor: null })).toBe(true);

    expect(accepts(pageSchema, { items: [] })).toBe(false);
    expect(accepts(pageSchema, { items: [], nextCursor: '' })).toBe(false);
  });

  it('limit is read from a query string and capped at 50', () => {
    const { limit } = pageQueryShape;

    expect(limit.parse('20')).toBe(20);
    expect(limit.parse(undefined)).toBeUndefined();
    for (const value of ['51', '0', '-1', '2.5', 'abc', '']) {
      expect(accepts(limit, value), value).toBe(false);
    }
  });

  it('a number in a query string is plain decimal digits and nothing looser', () => {
    const offset = queryIntegerSchema(-720, 840);

    expect(offset.parse('345')).toBe(345);
    expect(offset.parse('-480')).toBe(-480);
    expect(offset.parse('0')).toBe(0);
    expect(offset.parse(345)).toBe(345);
    for (const value of ['0x10', '1e1', ' 5 ', '+5', '05', '-0', '5.0', '', true, null, ['7']]) {
      expect(accepts(offset, value), JSON.stringify(value)).toBe(false);
    }
    expect(accepts(offset, '841')).toBe(false);
    expect(accepts(offset, '99999999999999999999')).toBe(false);
  });
});
