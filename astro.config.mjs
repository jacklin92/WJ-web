// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import devApiPlugin from './dev-api-plugin.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://jacklin92.github.io',
  base: '/WJ-web',
  integrations: [mdx(), sitemap(), react()],

  vite: {
    plugins: [
      tailwindcss(),
      devApiPlugin(),
    ],
  },
});