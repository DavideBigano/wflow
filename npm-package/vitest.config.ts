import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        // @testing-library/react's renderHook needs a DOM to mount into;
        // ink's own tests rely on the node environment's process.stdout, so
        // scope jsdom to just the hooks under test instead of switching globally.
        environmentMatchGlobs: [['src/lib/hooks/**', 'jsdom']],
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
