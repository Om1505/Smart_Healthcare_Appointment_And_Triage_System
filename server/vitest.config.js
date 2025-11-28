const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,        
    coverage: {
      provider: 'v8',
      include: ["server/routes/prescriptions.js"],
      reporter: ['text', 'html'],
    },
  },
});
