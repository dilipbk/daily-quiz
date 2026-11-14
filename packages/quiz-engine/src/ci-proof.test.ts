import { expect, it } from 'vitest';

// Throwaway: proves that a failing test blocks a merge (FND-02). Never merge this.
it('fails on purpose', () => {
  expect(1 + 1).toBe(3);
});
