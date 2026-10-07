// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import naut from 'nautcms/integration';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://nautilicious-demo.vercel.app',
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    naut({ env: process.env }),
  ]
});