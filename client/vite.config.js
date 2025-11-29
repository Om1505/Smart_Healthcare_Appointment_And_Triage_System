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
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
    exclude: [
      '**/.stryker-tmp/**',
      '**/node_modules/**/.stryker-tmp/**',
      '**/.stryker-tmp/**/sandbox*/**',
      'node_modules/server/**',
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})