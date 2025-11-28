import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Allows using describe, it, expect without importing them
    environment: 'node', // Crucial for backend testing
    fileParallelism: false, // Often needed for database tests to prevent collisions
    hookTimeout: 180000, // 3 minutes for hooks like beforeAll/afterAll (MongoDB download)
    testTimeout: 30000, // 30 seconds for individual tests

    // Ensure Vitest discovers your tests (important for Stryker dry-run)
    include: ['Test/appointments.test.js'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      // Corrected glob to include all route files
      include: ['routes/**/*.js'],
      exclude: ['node_modules/**', 'Test/**', 'coverage/**'],
      all: false, // Don't include all files, only the ones tested
    },
  },
});
