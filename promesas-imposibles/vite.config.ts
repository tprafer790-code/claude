import { defineConfig } from 'vitest/config';

// `npm run build` → versión web genérica. `npm run build:poki` → inyecta el SDK de Poki.
// Las herramientas de desarrollo se cargan con import dinámico bajo import.meta.env.DEV,
// así que no entran en ninguna compilación de producción.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    outDir: mode === 'poki' ? 'dist-poki' : 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    {
      name: 'poki-sdk',
      transformIndexHtml(html: string) {
        const tag = mode === 'poki' ? '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>' : '';
        return html.replace('<!--POKI_SDK-->', tag);
      },
    },
  ],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
