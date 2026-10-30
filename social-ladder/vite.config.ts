import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** `--mode family` builds the international family edition (see src/edition.ts). */
export default defineConfig(({ mode }) => {
  const family = mode === 'family';
  return {
    plugins: [react()],
    define: { __EDITION__: JSON.stringify(family ? 'family' : 'classic') },
    base: './',
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
    test: {
      environment: 'node',
      // Edition-neutral suites run in both editions; the rest only where their content exists.
      include: family ? ['tests/{engine,fx,retention,validate,family}.test.ts'] : ['tests/**/*.test.ts'],
      exclude: family ? [] : ['tests/family.test.ts'],
    },
  };
});
