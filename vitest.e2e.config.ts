import { defineConfig } from 'vitest/config';

/**
 * Live end-to-end tests against the Retell API (opt-in).
 *
 *   RETELL_E2E_API_KEY=key_... npm run test:e2e
 *
 * Without RETELL_E2E_API_KEY every suite is skipped.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Steps within a file depend on each other; never run files in parallel
    // against the same account.
    fileParallelism: false,
  },
});
