import path from "path"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // This is the new file you'll create
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'], // Reports to generate
      reportsDirectory: './coverage', // Where to output the reports
    },
  },
})