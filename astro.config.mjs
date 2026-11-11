// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { syncedMediaDevPlugin } from './scripts/vite-synced-media-plugin.ts';

const SITE = 'https://regaloskawaii.es';

/** Páginas que no aportan nada en los buscadores: fuera del sitemap. */
const SIN_SITEMAP = new Set(['/aviso-legal', '/aviso-afiliados', '/cookies', '/privacidad']);

/**
 * Ruta de una URL del sitemap, sin barra final: «https://…/categoria/papeleria» → «/categoria/papeleria».
 * @param {string} url
 */
function rutaDe(url) {
  const ruta = new URL(url).pathname;
  return ruta.length > 1 ? ruta.replace(/\/$/, '') : ruta;
}

/**
 * Fechas de última modificación que escribe el catálogo durante la build
 * (`writeSitemapLastmod` en src/lib/catalog/buildCatalog.ts). Se leen al generar el
 * sitemap, que es al final de la build.
 */
/** @type {Record<string, string> | undefined} */
let lastmod;

/** @type {Set<string> | undefined} */
let sitemapExclude;

/** @returns {Set<string>} */
function rutasExcluidas() {
  if (!sitemapExclude) {
    try {
      sitemapExclude = new Set(
        JSON.parse(readFileSync(new URL('./.cache/sitemap-exclude.json', import.meta.url), 'utf-8')),
      );
    } catch {
      sitemapExclude = new Set();
    }
  }
  return sitemapExclude;
}
/** @param {string} ruta */
function lastmodDe(ruta) {
  if (!lastmod) {
    try {
      lastmod = JSON.parse(readFileSync(new URL('./.cache/sitemap-lastmod.json', import.meta.url), 'utf-8'));
    } catch {
      /* sin fichero: sin lastmod */
    }
    lastmod ??= {};
  }
  return lastmod?.[ruta];
}

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: SITE,
  // URL sin barra final («/categoria/papeleria»), igual que los enlaces internos.
  // Cloudflare Pages sirve «categoria/papeleria.html» en «/categoria/papeleria».
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      filter: (url) => {
        const ruta = rutaDe(url);
        if (SIN_SITEMAP.has(ruta)) return false;
        if (rutasExcluidas().has(ruta)) return false;
        return true;
      },
      serialize(item) {
        const fecha = lastmodDe(rutaDe(item.url));
        if (fecha) item.lastmod = fecha;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss(), syncedMediaDevPlugin()],
    build: { assetsInlineLimit: 0 },
  },
});
