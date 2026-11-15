import { describe, expect, it } from '@jest/globals';

import { checks } from './checks';

describe('checks', () => {
  it('gives every check a unique id, a label and at least one platform', () => {
    const ids = checks.map((check) => check.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const check of checks) {
      expect(check.label).not.toBe('');
      expect(check.platforms.length).toBeGreaterThan(0);
    }
  });
});
