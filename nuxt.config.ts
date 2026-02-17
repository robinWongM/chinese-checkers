import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'node:url';

const gameDir = fileURLToPath(new URL('./game', import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  alias: {
    '@game': gameDir,
    '~game': gameDir,
  },
  typescript: {
    typeCheck: true,
  },
});
