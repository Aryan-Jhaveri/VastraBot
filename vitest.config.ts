import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: [
      'references/**',
      'dist/**',
      'node_modules/**',
    ],
    env: {
      CLOSET_DATA_DIR: '/tmp/closet-test',
    },
    isolate: false,
  },
})
