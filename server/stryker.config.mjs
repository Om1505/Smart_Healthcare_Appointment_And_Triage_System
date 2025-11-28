/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "json"],
  testRunner: "vitest",
  coverageAnalysis: "off",

  mutate: [
    "routes/appointments.js"
  ],

  vitest: {
    configFile: 'vitest.config.js',
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
