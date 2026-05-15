import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/unit/setup.js'],
    include: ['test/unit/**/*.test.js'],
  },
});
