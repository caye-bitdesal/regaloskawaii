// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { syncedMediaDevPlugin } from './scripts/vite-synced-media-plugin.ts';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://regaloskawaii.es',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss(), syncedMediaDevPlugin()],
  },
});
