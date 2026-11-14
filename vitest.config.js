import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // One run from the root covers every package, so a new test file can't be left out of `pnpm verify`.
    include: ['packages/*/{src,tests}/**/*.test.ts'],
    environment: 'node',
  },
});
