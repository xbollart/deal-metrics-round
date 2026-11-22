import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'istanbul',
      include: ['app/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportOnFailure: true,
    }
  },
});
