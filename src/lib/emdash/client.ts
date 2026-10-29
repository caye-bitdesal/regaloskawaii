import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot, SNAPSHOT_PATH, type ContentSnapshot } from '../content/snapshot';
import { env } from '../runtime/env';
import type { ReferenceSummary } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../../../fixtures/emdash');

let snapshotMem: ContentSnapshot | null | undefined;

export class EmDashError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'EmDashError';
  }
}

function forceApi(): boolean {
  return env('EMDASH_FORCE_API') === '1' || env('EMDASH_FORCE_API') === 'true';
}

function useFixtures(): boolean {
  if (forceApi()) return false;
  if (useContentCache()) return false;
  const flag = env('EMDASH_USE_FIXTURES');
  if (flag === '1' || flag === 'true') return true;
  if (existsSync(SNAPSHOT_PATH)) return false;
  return !env('EMDASH_TOKEN');
}

function useContentCache(): boolean {
  if (forceApi()) return false;
  const flag = env('EMDASH_CONTENT_CACHE');
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  return existsSync(SNAPSHOT_PATH);
}

async function getSnapshot(): Promise<ContentSnapshot | null> {
  if (snapshotMem !== undefined) return snapshotMem;
  snapshotMem = await readSnapshot();
  return snapshotMem;
}

function baseUrl(): string {
  return (env('EMDASH_URL') ?? 'http://localhost:4321').replace(/\/$/, '');
}

function authToken(): string | undefined {
  return env('EMDASH_TOKEN');
}

async function loadFixture<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(FIXTURES_DIR, filename), 'utf-8');
  const parsed = JSON.parse(raw) as { success: boolean; data: T; error?: { code: string; message: string } };
  if (!parsed.success) {
    throw new EmDashError(parsed.error?.message ?? 'Fixture error', parsed.error?.code);
  }
  return parsed.data;
}

async function fetchJson<T>(urlPath: string): Promise<T> {
  const token = authToken();
  if (!token) {
    throw new EmDashError('EMDASH_TOKEN missing');
  }
  const res = await fetch(`${baseUrl()}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
  };
  if (!body.success) {
    throw new EmDashError(body.error?.message ?? res.statusText, body.error?.code);
  }
  return body.data;
}

export interface PaginatedItems<T> {
  items: T[];
  total?: number;
  nextCursor?: string;
}

export async function fetchAllItems<T>(
  listPath: string,
  fixtureFile: string,
): Promise<T[]> {
  if (useContentCache()) {
    const snap = await getSnapshot();
    if (!snap) {
      throw new EmDashError(
        'No hay caché de contenido. Ejecuta: npm run sync-content',
        'CONTENT_CACHE_MISSING',
      );
    }
    if (listPath.includes('/productos')) return snap.productos as T[];
    if (listPath.includes('/colecciones')) return snap.colecciones as T[];
    if (listPath.includes('/tiendas')) return snap.tiendas as T[];
    if (listPath.includes('/pages')) return snap.pages as T[];
    throw new EmDashError(`Listado no en caché: ${listPath}`, 'CONTENT_CACHE_MISSING');
  }

  if (useFixtures()) {
    const data = await loadFixture<PaginatedItems<T>>(fixtureFile);
    return data.items ?? [];
  }

  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ status: 'published', limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const data = await fetchJson<PaginatedItems<T>>(`${listPath}?${qs.toString()}`);
    items.push(...(data.items ?? []));
    cursor = data.nextCursor;
  } while (cursor);

  return items;
}

export async function fetchCollectionProductRefs(
  collectionId: string,
): Promise<ReferenceSummary[]> {
  if (useContentCache()) {
    const snap = await getSnapshot();
    if (!snap) throw new EmDashError('No hay caché de contenido.', 'CONTENT_CACHE_MISSING');
    return snap.collectionProductRefs[collectionId] ?? [];
  }

  if (useFixtures()) {
    const colecciones = await loadFixture<PaginatedItems<{ id: string; slug: string }>>(
      '07-colecciones-lista.json',
    );
    const col = colecciones.items.find((c) => c.id === collectionId);
    if (col?.slug === 'menos-de-10') {
      const data = await loadFixture<{ parents: ReferenceSummary[] }>(
        '08-coleccion-productos.json',
      );
      return data.parents ?? [];
    }
    return [];
  }

  const data = await fetchJson<{ parents: ReferenceSummary[] }>(
    `/_emdash/api/content/colecciones/${collectionId}/references/productos_colecciones/parents`,
  );
  return data.parents ?? [];
}

export async function fetchProductStoreRefs(productId: string): Promise<ReferenceSummary[]> {
  if (useContentCache()) {
    const snap = await getSnapshot();
    if (!snap) throw new EmDashError('No hay caché de contenido.', 'CONTENT_CACHE_MISSING');
    return snap.productStoreRefs[productId] ?? [];
  }

  if (useFixtures()) {
    void productId;
    const data = await loadFixture<{ children: ReferenceSummary[] }>('03-producto-tienda.json');
    return data.children ?? [];
  }
  const data = await fetchJson<{ children: ReferenceSummary[] }>(
    `/_emdash/api/content/productos/${productId}/references/productos_tienda/children`,
  );
  return data.children ?? [];
}

export { useFixtures, useContentCache, baseUrl as getEmDashBaseUrl };
