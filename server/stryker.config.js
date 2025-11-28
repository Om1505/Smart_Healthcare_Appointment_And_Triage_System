/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
const config = {
  // Only mutate source files (routes and models). Do NOT mutate test files.
  mutate: ['routes/**/*.js', 'models/**/*.js'],
  testRunner: 'vitest',
  vitest: {
    // Disable related-test lookup so Vitest runs all tests (avoids "No tests were executed").
    // Stryker/Vitest integration otherwise expects tests to `import` mutated files.
    configFile: 'vitest.config.js',
    related: false,
  },  
  reporters: ['html', 'progress'],
  coverageAnalysis: 'perTest',
  timeoutMS: 10000,
};

export default config;
