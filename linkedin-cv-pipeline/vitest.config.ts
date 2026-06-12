import { defineConfig } from 'vitest/config';

// Explicit config so vitest never walks up into the host repo's vite.config.js
// while this project lives nested inside language-trainer (DECISIONS D1).
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['test/**/*.test.ts'],
  },
});
