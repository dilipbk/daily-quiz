import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // One run from the root covers every package, so a new test file can't be left out of `pnpm verify`.
    // `apps/api` is named alone: `apps/mobile` runs its own tests on Jest. BE-02 gives the API
    // a Vitest project of its own, on real Postgres (ADR 0002, 0065).
    include: ['packages/*/{src,tests}/**/*.test.ts', 'apps/api/{src,tests}/**/*.test.ts'],
    environment: 'node',
  },
});
