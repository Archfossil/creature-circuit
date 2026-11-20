import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  // online play in development: run `npm run server` alongside `npm run dev`
  server: { proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } } },
});
