// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "json"],
  testRunner: "vitest",
  coverageAnalysis: "off",

  mutate: [
    "routes/**/*.js"
  ],

  vitest: {
    configFile: 'vitest.config.js',
    // Disable related tests to ensure all tests run for each mutant
    related: false
  },

  disableTypeChecks: '{test,spec,routes}/**/*.{js,ts}',

  timeoutMS: 120000,
  timeoutFactor: 3,

  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },

  ignorePatterns: ["dist", "coverage", ".git", "node_modules"]
};

export default config;
