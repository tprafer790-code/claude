import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Loads the CrazyGames SDK before the game, as its docs ask (in the head of index.html). */
const crazyGamesSdk = (): Plugin => ({
  name: 'crazygames-sdk',
  transformIndexHtml: (html) => html.replace('<title>', '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n    <title>'),
});

/**
 * Modes: default = classic edition; `family` = international family edition
 * (see src/edition.ts); `crazygames` = the family edition wired to the
 * CrazyGames SDK, ready to upload.
 */
export default defineConfig(({ mode }) => {
  const portal = mode === 'crazygames' ? 'crazygames' : 'none';
  const family = mode === 'family' || portal !== 'none';
  return {
    plugins: [react(), ...(portal === 'crazygames' ? [crazyGamesSdk()] : [])],
    define: {
      __EDITION__: JSON.stringify(family ? 'family' : 'classic'),
      __PORTAL__: JSON.stringify(portal),
    },
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
      include: family ? ['tests/{engine,fx,retention,validate,family,portal}.test.ts'] : ['tests/**/*.test.ts'],
      exclude: family ? [] : ['tests/family.test.ts'],
    },
  };
});
