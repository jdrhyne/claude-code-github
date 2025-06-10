import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    testTimeout: 30000,
    hookTimeout: 20000,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/__tests__/e2e.test.ts',
      'src/__tests__/edge-cases.test.ts'
    ],
    coverage: {
      ...baseConfig.test?.coverage,
      exclude: [
        ...(baseConfig.test?.coverage?.exclude || []),
        'src/__tests__/utils/**'
      ]
    }
  }
});