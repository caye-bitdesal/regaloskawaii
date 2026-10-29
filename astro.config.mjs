// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { syncedMediaDevPlugin } from './scripts/vite-synced-media-plugin.ts';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://regaloskawaii.es',
  vite: {
    plugins: [tailwindcss(), syncedMediaDevPlugin()],
  },
});
