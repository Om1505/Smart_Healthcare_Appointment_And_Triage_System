import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, 
    environment: 'node', 
    fileParallelism: false, 
    hookTimeout: 180000, 
    testTimeout: 30000,
    related: false, // Disable related tests for Stryker

    include: ['Test/**/*js'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['routes/**/*.js'],
      exclude: [
        'node_modules/**',
        'Test/**',
        'vitest.config.js',
      ],
    },
  },
});
