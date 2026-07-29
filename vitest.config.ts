import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'tests/hono/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
