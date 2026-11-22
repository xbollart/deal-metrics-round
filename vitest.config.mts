import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'istanbul',
      include: ['app/**/*.ts'],
      // The entry point only runs in the separate process started by the
      // e2e tests, which the coverage tool cannot see.
      exclude: ['app/program.ts'],
      reporter: ['text', 'html'],
      reportOnFailure: true,
      // A coverage run fails if these files are not fully covered.
      thresholds: {
        'app/gilded-rose.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'app/report.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
