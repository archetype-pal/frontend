import { createRequire } from 'node:module';
import path from 'node:path';
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

// Building a fresh jsdom for every test file used to be ~60% of the suite's
// wall time, so the suite is split in two projects:
// - `unit` (*.test.ts): pure logic, runs in plain Node. A file that needs a DOM
//   opts in with a `/** @vitest-environment jsdom */` pragma.
// - `dom` (*.test.tsx and hook tests): run under `vmThreads`, which creates
//   jsdom once per worker and still gives each file its own module graph.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.next/**', '.claude/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          exclude: [...configDefaults.exclude, '.next/**', '.claude/**', 'hooks/**'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['**/*.test.tsx', 'hooks/**/*.test.ts'],
          environment: 'jsdom',
          pool: 'vmThreads',
        },
        resolve: {
          alias: {
            // The Node build of isomorphic-dompurify boots its own JSDOM (and
            // undici), which needs Node globals the vm context lacks. Tests
            // already have a window, so use the build the browser gets.
            'isomorphic-dompurify': path.join(
              path.dirname(require.resolve('isomorphic-dompurify')),
              'browser.mjs'
            ),
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
