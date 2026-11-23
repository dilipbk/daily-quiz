import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';

// `/health` is an operations probe, outside the contracts registry (ADR 0079, FND-07a D1 and D2).
describe('GET /health', () => {
  it("answers 200 with status ok and the build's commit", async () => {
    const response = await createApp({ commit: 'abc1234' }).request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', commit: 'abc1234' });
  });

  it('is never cached', async () => {
    const response = await createApp({ commit: 'abc1234' }).request('/health');

    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
