import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Avoid picking up nested-project tests in this mono-repo-like workspace.
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'AI_Football_Manager/**'],
  },
})

