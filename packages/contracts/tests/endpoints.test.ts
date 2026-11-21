import { describe, expect, it } from 'vitest';
import { accessLevels, areas } from '../src/endpoint.ts';
import { endpointList, endpoints, sharedSchemas } from '../src/endpoints.ts';
import { errorCodes } from '../src/errors.ts';

// The endpoint registry: every endpoint as data, before either side implements it (roadmap §7).
// These hold for the whole list, so a new endpoint can't quietly break a rule of spec §19.2.

const pathNames = (path: string): string[] =>
  [...path.matchAll(/:([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1] ?? '').sort();

describe('the endpoint registry', () => {
  it('holds the twelve endpoints of v0', () => {
    expect(endpointList.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).toEqual([
      'GET /config',
      'POST /auth/guest',
      'GET /me',
      'PATCH /me',
      'PUT /devices/:deviceId',
      'GET /domains',
      'GET /quizzes',
      'GET /quizzes/:quizId',
      'GET /daily/global/:date/:contentVersion',
      'POST /sessions',
      'POST /sessions/:sessionId/complete',
      'GET /me/progress',
    ]);
    expect(Object.values(endpoints)).toEqual(endpointList);
  });

  it('ids are unique, and so is each method and path', () => {
    const ids = endpointList.map((endpoint) => endpoint.id);
    const routes = endpointList.map((endpoint) => `${endpoint.method} ${endpoint.path}`);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*\.[a-z][A-Za-z0-9]*$/);
  });

  it('a path’s :names are exactly the keys of its params schema', () => {
    for (const endpoint of endpointList) {
      const inSchema = Object.keys(endpoint.params?.shape ?? {}).sort();

      expect(pathNames(endpoint.path), endpoint.id).toEqual(inSchema);
    }
  });

  it('every endpoint declares an access level, and none is admin in v0', () => {
    for (const endpoint of endpointList) {
      expect(accessLevels, endpoint.id).toContain(endpoint.access);
      expect(endpoint.access, endpoint.id).not.toBe('admin');
      expect(areas, endpoint.id).toContain(endpoint.area);
      expect(endpoint.summary.trim(), endpoint.id).not.toBe('');
    }
  });

  it('what a player owns is never public', () => {
    const publicPaths = endpointList
      .filter((endpoint) => endpoint.access === 'public')
      .map((endpoint) => endpoint.path);

    expect(publicPaths).toEqual([
      '/config',
      '/auth/guest',
      '/domains',
      '/quizzes',
      '/quizzes/:quizId',
      '/daily/global/:date/:contentVersion',
    ]);
  });

  it('a GET has no body and no idempotency key, and nothing per-player is cached', () => {
    for (const endpoint of endpointList) {
      if (endpoint.method === 'GET') {
        expect(endpoint.body, endpoint.id).toBeNull();
        expect(endpoint.idempotencyKey, endpoint.id).toBe(false);
      } else {
        expect(endpoint.caching, endpoint.id).toBe('none');
      }
      // Per-player responses are private (roadmap §7): only public reads carry an ETag.
      if (endpoint.access !== 'public') expect(endpoint.caching, endpoint.id).toBe('none');
    }
  });

  it('sessions.complete requires an Idempotency-Key, and is the only endpoint in v0 that does', () => {
    expect(endpoints.completeSession.idempotencyKey).toBe(true);
    expect(endpointList.filter((endpoint) => endpoint.idempotencyKey)).toEqual([
      endpoints.completeSession,
    ]);
  });

  it('every listed error code is in the catalogue, once', () => {
    for (const endpoint of endpointList) {
      expect(new Set(endpoint.errors).size, endpoint.id).toBe(endpoint.errors.length);
      for (const code of endpoint.errors) expect(errorCodes, endpoint.id).toContain(code);
    }
  });

  it('only a response with a body is a 200, and only one without is a 204', () => {
    for (const { id, success } of endpointList) {
      expect(success.status === 204, id).toBe(success.body === null);
    }
  });

  it('shared schemas are named once each, in PascalCase', () => {
    const names = Object.keys(sharedSchemas);

    for (const name of names) expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
    expect(new Set(Object.values(sharedSchemas)).size).toBe(names.length);
  });
});
