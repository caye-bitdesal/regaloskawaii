import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getEmDashBaseUrl } from '../emdash/client';
import { mediaUrl } from '../emdash/helpers';
import type { ProductoEntry } from '../emdash/types';
import { shouldKeepMediaFile } from './cleanup';
import { PUBLIC_MEDIA_DIR } from './paths';

export { PUBLIC_MEDIA_DIR } from './paths';

/**
 * Descargas a la vez. Las imágenes las sirve el Worker de EmDash (poca CPU por petición en
 * el plan gratuito): pocas a la vez y con reintentos para no provocar 503.
 */
const CONCURRENCY = 2;
const RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeBasename(storageKey: string): string {
  const base = path.basename(storageKey);
  if (!base || base === '.' || base.includes('..')) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }
  return base;
}

export function localMediaPath(storageKey: string): string {
  return `/media/${safeBasename(storageKey)}`;
}

export function collectStorageKeysFromProductos(productos: ProductoEntry[]): string[] {
  const keys = new Set<string>();
  for (const p of productos) {
    const d = p.data;
    if (d.imagen?.meta.storageKey) keys.add(d.imagen.meta.storageKey);
    for (const g of d.galeria ?? []) {
      if (g.imagen?.meta.storageKey) keys.add(g.imagen.meta.storageKey);
    }
  }
  return [...keys];
}

async function downloadOne(storageKey: string, emdashUrl: string): Promise<void> {
  const filename = safeBasename(storageKey);
  const dest = path.join(PUBLIC_MEDIA_DIR, filename);
  const url = mediaUrl(storageKey, emdashUrl);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url).catch(() => undefined);
    if (res?.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      // Escritura atómica: un fichero a medias nunca se queda en la caché.
      await writeFile(`${dest}.part`, buf);
      await rename(`${dest}.part`, dest);
      return;
    }
    const retryable = !res || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= RETRIES) {
      throw new Error(`Media ${storageKey}: HTTP ${res?.status ?? 'error de red'}`);
    }
    await sleep(Math.min(2000 * 2 ** attempt, 30_000));
  }
}

async function runPool(keys: string[], emdashUrl: string): Promise<{ ok: number; failed: string[] }> {
  const failed: string[] = [];
  let ok = 0;
  let i = 0;

  async function worker(): Promise<void> {
    while (i < keys.length) {
      const idx = i++;
      const key = keys[idx];
      try {
        await downloadOne(key, emdashUrl);
        ok++;
      } catch {
        failed.push(key);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, keys.length) }, () => worker()));
  return { ok, failed };
}

/**
 * Deja public/media con exactamente las imágenes del catálogo: descarga solo las que faltan
 * (las claves de EmDash no cambian de contenido, así que una imagen ya descargada vale) y
 * borra las que ya no se usan. En GitHub Actions la carpeta se guarda en caché entre builds,
 * así que normalmente solo se descargan las imágenes nuevas.
 */
export async function syncMediaFiles(
  storageKeys: string[],
  emdashUrl = getEmDashBaseUrl(),
): Promise<{ ok: number; failed: string[]; reused?: number }> {
  await mkdir(PUBLIC_MEDIA_DIR, { recursive: true });

  const unique = [...new Set(storageKeys.filter(Boolean))];
  const wanted = new Set(unique.map(safeBasename));

  // Fuera lo que sobra (imágenes de productos borrados, descargas a medias).
  for (const name of await readdir(PUBLIC_MEDIA_DIR)) {
    if (!shouldKeepMediaFile(name, wanted)) {
      await rm(path.join(PUBLIC_MEDIA_DIR, name), { force: true });
    }
  }

  const missing: string[] = [];
  for (const key of unique) {
    const size = await stat(path.join(PUBLIC_MEDIA_DIR, safeBasename(key)))
      .then((st) => st.size)
      .catch(() => 0);
    if (size === 0) missing.push(key);
  }
  const reused = unique.length - missing.length;
  if (missing.length === 0) return { ok: 0, failed: [], reused };

  const result = await runPool(missing, emdashUrl);
  return { ...result, reused };
}
