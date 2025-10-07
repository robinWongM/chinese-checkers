/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    target: 'es2020'
  },
  server: {
    port: 3000,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
  }
});

