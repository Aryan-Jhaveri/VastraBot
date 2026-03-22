import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['references/**', 'dist/**', 'node_modules/**'],
    env: {
      CLOSET_DATA_DIR: '/tmp/closet-test',
    },
  },
})
