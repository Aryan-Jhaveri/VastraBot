import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      'references/**',
      'dist/**',
      'node_modules/**',
      // Frontend SPA has its own vitest config with jsdom environment
      'src/transport/web/app/**',
    ],
    env: {
      CLOSET_DATA_DIR: '/tmp/closet-test',
    },
    isolate: false,
  },
})
