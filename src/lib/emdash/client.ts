import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot, SNAPSHOT_PATH, type ContentSnapshot } from '../content/snapshot';
import { env } from '../runtime/env';
import type { ReferenceSummary, TaxonomyTerm } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../../../fixtures/emdash');

type ProductTaxonomy = 'categoria' | 'marca' | 'personaje';

const TAXONOMY_LIST_FIXTURE: Record<ProductTaxonomy, string> = {
  categoria: '14-categoria-terminos.json',
  marca: '17-marca-terminos.json',
  personaje: '12-personajes-terminos.json',
};

/** Colección → ids de producto (fixtures; coherente con seed de ejemplo). */
const FIXTURE_COLLECTION_PARENTS: Record<string, string[]> = {
  '01M61R19HPS906VXNFW97FAGEB': [
    '01M61R19KEXN3VFX3T9NSNMJ70',
    '01M61R19M3XH5SGGTHNAN6YGWC',
  ],
  '01M61R19J3HCYA7RQTCVDNW8HG': ['01M61R19MACE1WCK8M0G51MM79'],
  '01M61R19J0DBVNHPYNV0ER6HGA': ['01M61R19MACE1WCK8M0G51MM79'],
};

/** Producto → slugs de categoría (fixtures). */
const FIXTURE_PRODUCT_CATEGORIAS: Record<string, TaxonomyTerm[]> = {
  '01M61R19KEXN3VFX3T9NSNMJ70': [
    {
      id: 'cat-peluches',
      name: 'categoria',
      slug: 'peluches',
      label: 'Peluches',
      parentId: null,
      locale: 'es',
      translationGroup: 'cat-peluches',
    },
  ],
  '01M61R19M3XH5SGGTHNAN6YGWC': [
    {
      id: 'cat-papeleria',
      name: 'categoria',
      slug: 'papeleria',
      label: 'Papelería',
      parentId: null,
      locale: 'es',
      translationGroup: 'cat-papeleria',
    },
  ],
  '01M61R19MACE1WCK8M0G51MM79': [
    {
      id: 'cat-cajas-sorpresa',
      name: 'categoria',
      slug: 'cajas-sorpresa',
      label: 'Cajas sorpresa',
      parentId: null,
      locale: 'es',
      translationGroup: 'cat-cajas-sorpresa',
    },
  ],
};

const FIXTURE_PRODUCT_MARCAS: Record<string, TaxonomyTerm[]> = {
  '01M61R19KEXN3VFX3T9NSNMJ70': [
    {
      id: '01M61R19GX50G4FR3SGTXY0ZJG',
      name: 'marca',
      slug: 'sanrio',
      label: 'Sanrio',
      parentId: null,
      locale: 'es',
      translationGroup: '01M61R19GX50G4FR3SGTXY0ZJG',
    },
  ],
  '01M61R19MACE1WCK8M0G51MM79': [
    {
      id: 'marca-pop-mart',
      name: 'marca',
      slug: 'pop-mart',
      label: 'Pop Mart',
      parentId: null,
      locale: 'es',
      translationGroup: 'marca-pop-mart',
    },
  ],
};

const FIXTURE_PRODUCT_PERSONAJES: Record<string, TaxonomyTerm[]> = {
  '01M61R19KEXN3VFX3T9NSNMJ70': [
    {
      id: '01M61R19GK653QGMCAFK6W4D7M',
      name: 'personaje',
      slug: 'kuromi',
      label: 'Kuromi',
      parentId: null,
      locale: 'es',
      translationGroup: '01M61R19GK653QGMCAFK6W4D7M',
    },
  ],
  '01M61R19MACE1WCK8M0G51MM79': [
    {
      id: '01M61R19GW28MADMX3G1C4AYDV',
      name: 'personaje',
      slug: 'labubu',
      label: 'Labubu',
      parentId: null,
      locale: 'es',
      translationGroup: '01M61R19GW28MADMX3G1C4AYDV',
    },
  ],
};

const FIXTURE_PRODUCT_BY_TAXONOMY: Record<ProductTaxonomy, Record<string, TaxonomyTerm[]>> = {
  categoria: FIXTURE_PRODUCT_CATEGORIAS,
  marca: FIXTURE_PRODUCT_MARCAS,
  personaje: FIXTURE_PRODUCT_PERSONAJES,
};

function snapshotTaxonomyList(snap: ContentSnapshot, name: ProductTaxonomy): TaxonomyTerm[] {
  if (name === 'categoria') return snap.categoriaTerms ?? [];
  if (name === 'marca') return snap.marcaTerms ?? [];
  return snap.personajeTerms ?? [];
}

function snapshotProductTaxonomy(
  snap: ContentSnapshot,
  name: ProductTaxonomy,
  productId: string,
): TaxonomyTerm[] {
  if (name === 'categoria') return snap.productCategoriaTerms[productId] ?? [];
  if (name === 'marca') return snap.productMarcaTerms?.[productId] ?? [];
  return snap.productPersonajeTerms?.[productId] ?? [];
}

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
    const productIds = FIXTURE_COLLECTION_PARENTS[collectionId];
    if (!productIds?.length) return [];
    const productos = await loadFixture<PaginatedItems<{ id: string; slug: string; data: { title: string } }>>(
      '01-productos-lista.json',
    );
    return productIds
      .map((id, sortOrder) => {
        const p = productos.items.find((item) => item.id === id);
        if (!p) return null;
        return {
          id: p.id,
          slug: p.slug,
          collection: 'productos',
          title: p.data.title,
          locale: 'es',
          sortOrder,
        } satisfies ReferenceSummary;
      })
      .filter(Boolean) as ReferenceSummary[];
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

export async function fetchTaxonomyTerms(name: ProductTaxonomy): Promise<TaxonomyTerm[]> {
  if (useContentCache()) {
    const snap = await getSnapshot();
    if (!snap) throw new EmDashError('No hay caché de contenido.', 'CONTENT_CACHE_MISSING');
    return snapshotTaxonomyList(snap, name);
  }

  if (useFixtures()) {
    const data = await loadFixture<{ terms: TaxonomyTerm[] }>(TAXONOMY_LIST_FIXTURE[name]);
    return data.terms ?? [];
  }

  const data = await fetchJson<{ terms: TaxonomyTerm[] }>(
    `/_emdash/api/taxonomies/${name}/terms`,
  );
  return data.terms ?? [];
}

export async function fetchProductTaxonomyTerms(
  productId: string,
  name: ProductTaxonomy,
): Promise<TaxonomyTerm[]> {
  if (useContentCache()) {
    const snap = await getSnapshot();
    if (!snap) throw new EmDashError('No hay caché de contenido.', 'CONTENT_CACHE_MISSING');
    return snapshotProductTaxonomy(snap, name, productId);
  }

  if (useFixtures()) {
    return FIXTURE_PRODUCT_BY_TAXONOMY[name][productId] ?? [];
  }

  const data = await fetchJson<{ terms: TaxonomyTerm[] }>(
    `/_emdash/api/content/productos/${productId}/terms/${name}`,
  );
  return data.terms ?? [];
}

export async function fetchAllProductTaxonomyTerms(
  productIds: string[],
  name: ProductTaxonomy,
): Promise<Record<string, TaxonomyTerm[]>> {
  const map: Record<string, TaxonomyTerm[]> = {};
  for (const id of productIds) {
    map[id] = await fetchProductTaxonomyTerms(id, name);
  }
  return map;
}

export async function fetchCategoriaTerms(): Promise<TaxonomyTerm[]> {
  return fetchTaxonomyTerms('categoria');
}

export async function fetchProductCategoriaTerms(productId: string): Promise<TaxonomyTerm[]> {
  return fetchProductTaxonomyTerms(productId, 'categoria');
}

export async function fetchAllProductCategoriaTerms(
  productIds: string[],
): Promise<Record<string, TaxonomyTerm[]>> {
  return fetchAllProductTaxonomyTerms(productIds, 'categoria');
}

export async function fetchMarcaTerms(): Promise<TaxonomyTerm[]> {
  return fetchTaxonomyTerms('marca');
}

export async function fetchPersonajeTerms(): Promise<TaxonomyTerm[]> {
  return fetchTaxonomyTerms('personaje');
}

export { useFixtures, useContentCache, baseUrl as getEmDashBaseUrl };
