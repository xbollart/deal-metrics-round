import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    include: ['test/vitest/**/*.{spec,test}.{js,ts}'],
    coverage: {
      provider: 'istanbul',
      include: ['app/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportOnFailure: true,
    }
  },
});
