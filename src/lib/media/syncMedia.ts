import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEmDashBaseUrl } from '../emdash/client';
import { mediaUrl } from '../emdash/helpers';
import type { ProductoEntry } from '../emdash/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_MEDIA_DIR = path.join(__dirname, '../../../public/media');

const CONCURRENCY = 6;

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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Media ${storageKey}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
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
 * Borra public/media y descarga todas las claves desde EmDash (endpoint público de ficheros).
 */
export async function syncMediaFiles(
  storageKeys: string[],
  emdashUrl = getEmDashBaseUrl(),
): Promise<{ ok: number; failed: string[] }> {
  await rm(PUBLIC_MEDIA_DIR, { recursive: true, force: true });
  await mkdir(PUBLIC_MEDIA_DIR, { recursive: true });

  const unique = [...new Set(storageKeys.filter(Boolean))];
  if (unique.length === 0) return { ok: 0, failed: [] };

  return runPool(unique, emdashUrl);
}
