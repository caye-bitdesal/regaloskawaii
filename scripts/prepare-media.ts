import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fetchAllItems } from '../src/lib/emdash/client.ts';
import { readSnapshot, SNAPSHOT_PATH } from '../src/lib/content/snapshot.ts';
import { ensureImageVariants } from '../src/lib/media/imageVariants.ts';
import { collectStorageKeysFromProductos } from '../src/lib/media/syncMedia.ts';
import type { ProductoEntry } from '../src/lib/emdash/types.ts';

async function loadProductos(): Promise<ProductoEntry[]> {
  if (existsSync(SNAPSHOT_PATH)) {
    const snap = await readSnapshot();
    if (snap?.productos?.length) return snap.productos;
  }
  return fetchAllItems<ProductoEntry>('/_emdash/api/content/productos', '01-productos-lista.json');
}

/**
 * Hero de reserva a partir de `og-default.png` (asset versionado en public/).
 * No genera la OG: debe ser el PNG de marca en el repositorio.
 */
export async function ensureHeroFallback(publicDir: string): Promise<void> {
  const ogPath = path.join(publicDir, 'og-default.png');
  const heroPath = path.join(publicDir, 'hero-fallback.jpg');
  if (!existsSync(ogPath) || existsSync(heroPath)) return;

  await sharp(ogPath).resize(800, 400, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(heroPath);
}

/** Variantes WebP en public/media antes de `astro build`, para que dist/ las copie con el HTML. */
export async function prepareMediaBeforeBuild(publicDir: string): Promise<void> {
  await ensureHeroFallback(publicDir);

  const productos = await loadProductos();
  const keys = collectStorageKeysFromProductos(productos);
  if (keys.length === 0) return;

  const { created, skipped } = await ensureImageVariants(keys);
  if (created > 0) {
    console.log(`[image-variants] ${created} generadas, ${skipped} omitidas`);
  }
}
