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

/** OG y hero de reserva: generados una vez en public/, sin depender de EmDash. */
export async function ensureStaticShareImages(publicDir: string): Promise<void> {
  const ogPath = path.join(publicDir, 'og-default.webp');
  const heroPath = path.join(publicDir, 'hero-fallback.webp');

  if (!existsSync(ogPath)) {
    await sharp({
      create: { width: 1200, height: 630, channels: 3, background: { r: 255, g: 245, b: 248 } },
    })
      .webp({ quality: 82 })
      .toFile(ogPath);
  }

  if (!existsSync(heroPath)) {
    await sharp(ogPath).resize(800, 400, { fit: 'cover' }).webp({ quality: 82 }).toFile(heroPath);
  }
}

/** Variantes WebP en public/media antes de `astro build`, para que dist/ las copie con el HTML. */
export async function prepareMediaBeforeBuild(publicDir: string): Promise<void> {
  await ensureStaticShareImages(publicDir);

  const productos = await loadProductos();
  const keys = collectStorageKeysFromProductos(productos);
  if (keys.length === 0) return;

  const { created, skipped } = await ensureImageVariants(keys);
  if (created > 0) {
    console.log(`[image-variants] ${created} generadas, ${skipped} omitidas`);
  }
}
