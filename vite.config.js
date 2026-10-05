import { defineConfig } from 'vite';
// base relativa: la build funciona desde cualquier subcarpeta o servidor estático.
export default defineConfig({ base: './', build: { target: 'es2020', chunkSizeWarningLimit: 900 } });
