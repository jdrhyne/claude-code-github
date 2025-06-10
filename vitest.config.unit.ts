import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/__tests__/e2e.test.ts',
      'src/__tests__/edge-cases.test.ts',
      'src/__tests__/utils/**'
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