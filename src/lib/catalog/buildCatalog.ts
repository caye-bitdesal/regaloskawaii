import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchAllItems,
  fetchAllProductCategoriaTerms,
  fetchAllProductTaxonomyTerms,
  fetchCategoriaTerms,
  fetchCollectionProductRefs,
  fetchMarcaTerms,
  fetchPersonajeTerms,
  fetchProductStoreRefs,
  getEmDashBaseUrl,
  useContentCache,
} from '../emdash/client';
import { buildCategoryTree, buildTaxonomyGroups, labelAt } from './taxonomyGroups';
import { flattenTerms, useFixtures } from '../emdash/client';
import {
  affiliateUrl,
  booleanFrom01,
  descuentoVigente,
  mediaUrl,
  prioridadProducto,
  stripInternalProductFields,
} from '../emdash/helpers';
import { sortProducts } from './sortProducts';
import {
  collectStorageKeysFromProductos,
  localMediaPath,
  PUBLIC_MEDIA_DIR,
  syncMediaFiles,
} from '../media/syncMedia';
import { readSnapshot } from '../content/snapshot';
import type { ProductoData } from '../emdash/types';
import type {
  Catalog,
  CatalogCollection,
  CatalogPage,
  CatalogProduct,
  CatalogSearchEntry,
  CatalogStore,
  ColeccionEntry,
  PageEntry,
  ProductoEntry,
  TaxonomyTerm,
  TiendaEntry,
} from '../emdash/types';
import { env, isAstroDev, isAstroProd } from '../runtime/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../../public');

function shouldSyncMedia(): boolean {
  if (isAstroDev()) return false;
  const flag = env('SYNC_MEDIA');
  return flag === '1' || flag === 'true';
}

function localMediaFileExists(storageKey: string): boolean {
  const file = path.join(PUBLIC_MEDIA_DIR, path.basename(storageKey));
  return existsSync(file);
}

/** Preferir /media/ si el fichero existe (p. ej. tras sync-content) o en build con caché. */
function resolveProductImageUrl(data: ProductoData, emdashUrl: string): string | undefined {
  const key = data.imagen?.meta.storageKey;
  if (!key) return undefined;

  if (localMediaFileExists(key)) return localMediaPath(key);

  const forceLocal =
    useContentCache() ||
    shouldSyncMedia() ||
    env('EMDASH_LOCAL_MEDIA') === '1' ||
    (isAstroProd() && !useFixtures());

  if (forceLocal) return localMediaPath(key);

  if (isAstroDev()) return mediaUrl(key, emdashUrl);

  return localMediaPath(key);
}

async function loadProductCategoriaTerms(
  productos: ProductoEntry[],
): Promise<Record<string, TaxonomyTerm[]>> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.productCategoriaTerms) return snap.productCategoriaTerms;
  }
  return fetchAllProductCategoriaTerms(productos.map((p) => p.id));
}

async function loadCategoriaTerms(): Promise<TaxonomyTerm[]> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.categoriaTerms?.length) return flattenTerms(snap.categoriaTerms);
  }
  return fetchCategoriaTerms();
}

async function loadMarcaTerms(): Promise<TaxonomyTerm[]> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.marcaTerms?.length) return snap.marcaTerms;
  }
  return fetchMarcaTerms();
}

async function loadPersonajeTerms(): Promise<TaxonomyTerm[]> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.personajeTerms?.length) return snap.personajeTerms;
  }
  return fetchPersonajeTerms();
}

async function loadProductMarcaTerms(
  productos: ProductoEntry[],
): Promise<Record<string, TaxonomyTerm[]>> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.productMarcaTerms) return snap.productMarcaTerms;
  }
  return fetchAllProductTaxonomyTerms(
    productos.map((p) => p.id),
    'marca',
  );
}

async function loadProductPersonajeTerms(
  productos: ProductoEntry[],
): Promise<Record<string, TaxonomyTerm[]>> {
  if (useContentCache()) {
    const snap = await readSnapshot();
    if (snap?.productPersonajeTerms) return snap.productPersonajeTerms;
  }
  return fetchAllProductTaxonomyTerms(
    productos.map((p) => p.id),
    'personaje',
  );
}

async function loadProductStoreRefs(
  productId: string,
  cached?: Record<string, import('../emdash/types').ReferenceSummary[]>,
): Promise<import('../emdash/types').ReferenceSummary[]> {
  if (cached?.[productId]) return cached[productId];
  return fetchProductStoreRefs(productId);
}

function buildStores(tiendas: TiendaEntry[], products: CatalogProduct[]): CatalogStore[] {
  const groups = new Map<string, CatalogStore>();
  for (const t of tiendas) {
    const slug = t.slug ?? t.id;
    groups.set(t.id, { id: t.id, slug, label: t.data.title, productIds: [], count: 0 });
  }
  for (const p of products) {
    const group = groups.get(p.tiendaId);
    if (group && !group.productIds.includes(p.id)) group.productIds.push(p.id);
  }
  return [...groups.values()]
    .map((item) => ({ ...item, count: item.productIds.length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export async function buildCatalog(): Promise<Catalog> {
  const emdashUrl = getEmDashBaseUrl();
  const snap = useContentCache() ? await readSnapshot() : null;

  const [productos, colecciones, tiendas, pages, categoriaTermsRaw, marcaTermsRaw, personajeTermsRaw] =
    await Promise.all([
      fetchAllItems<ProductoEntry>('/_emdash/api/content/productos', '01-productos-lista.json'),
      fetchAllItems<ColeccionEntry>(
        '/_emdash/api/content/colecciones',
        '07-colecciones-lista.json',
      ),
      fetchAllItems<TiendaEntry>('/_emdash/api/content/tiendas', '09-tiendas-lista.json'),
      fetchAllItems<PageEntry>('/_emdash/api/content/pages', '10-paginas-lista.json'),
      loadCategoriaTerms(),
      loadMarcaTerms(),
      loadPersonajeTerms(),
    ]);

  const [productCategoriaTerms, productMarcaTerms, productPersonajeTerms] = await Promise.all([
    loadProductCategoriaTerms(productos),
    loadProductMarcaTerms(productos),
    loadProductPersonajeTerms(productos),
  ]);

  if (shouldSyncMedia()) {
    const { ok, failed } = await syncMediaFiles(
      collectStorageKeysFromProductos(productos),
      emdashUrl,
    );
    if (failed.length > 0) {
      console.warn(`[sync-media] ${failed.length} imágenes no descargadas (${ok} ok)`);
    }
  }

  const tiendasActivas = tiendas.filter((t) => booleanFrom01(t.data.activa));
  const defaultTienda = tiendasActivas[0];

  const collectionProductIds = new Map<string, Set<string>>();
  for (const col of colecciones) {
    const refs =
      snap?.collectionProductRefs[col.id] ?? (await fetchCollectionProductRefs(col.id));
    const ids = new Set(refs.map((r) => r.id));
    collectionProductIds.set(col.id, ids);
  }

  const productCollectionSlugs = new Map<string, string[]>();
  for (const product of productos) {
    const slugs: string[] = [];
    for (const col of colecciones) {
      const ids = collectionProductIds.get(col.id);
      if (ids?.has(product.id)) slugs.push(col.slug);
    }
    productCollectionSlugs.set(product.id, slugs);
  }

  const products: CatalogProduct[] = [];

  for (const raw of productos) {
    const data = stripInternalProductFields(raw.data);
    const coleccionSlugs = productCollectionSlugs.get(raw.id) ?? [];
    const coleccionTitles = coleccionSlugs
      .map((s) => colecciones.find((c) => c.slug === s)?.data.title)
      .filter(Boolean) as string[];

    const catTerms = productCategoriaTerms[raw.id] ?? [];
    const categoriaSlugs = catTerms.map((t) => t.slug);
    const categoriaLabels = catTerms.map((t) => t.label);

    const marcaTerms = productMarcaTerms[raw.id] ?? [];
    const marcaSlugs = marcaTerms.map((t) => t.slug);
    const marcaLabels = marcaTerms.map((t) => t.label);

    const personajeTerms = productPersonajeTerms[raw.id] ?? [];
    const personajeSlugs = personajeTerms.map((t) => t.slug);
    const personajeLabels = personajeTerms.map((t) => t.label);

    let tienda = defaultTienda;
    const storeRefs = await loadProductStoreRefs(raw.id, snap?.productStoreRefs);
    if (storeRefs[0]) {
      const found = tiendasActivas.find((t) => t.id === storeRefs[0].id);
      if (found) tienda = found;
    }

    if (!tienda) continue;

    products.push({
      id: raw.id,
      slug: raw.slug,
      title: data.title,
      resumen: data.resumen ?? '',
      descripcion: data.descripcion,
      precioRef: data.precio_ref,
      descuento: descuentoVigente(data),
      autenticidadNoGarantizada: data.tipo === 'no-oficial',
      productoOficial: data.tipo === 'oficial',
      priority: prioridadProducto(data, tienda.data),
      imagenUrl: resolveProductImageUrl(data, emdashUrl),
      imagenAlt: data.imagen?.alt ?? data.title,
      destacado: booleanFrom01(data.destacado),
      categoriaSlugs,
      categoriaLabels,
      marcaSlugs,
      marcaLabels,
      personajeSlugs,
      personajeLabels,
      coleccionSlugs,
      coleccionTitles,
      tiendaId: tienda.id,
      tiendaTitle: tienda.data.title,
      affiliateUrl: affiliateUrl(data, tienda.data),
      updatedAt: raw.updatedAt,
      seo: raw.seo,
    });
  }

  const sortedProducts = sortProducts(products);

  const collections: CatalogCollection[] = colecciones
    .map((col) => ({
      id: col.id,
      slug: col.slug,
      title: col.data.title,
      descripcion: col.data.descripcion ?? '',
      orden: col.data.orden,
      destacada: booleanFrom01(col.data.destacada),
      productIds: sortedProducts
        .filter((p) => p.coleccionSlugs.includes(col.slug))
        .map((p) => p.id),
    }))
    .sort((a, b) => a.orden - b.orden);

  const { categories, allCategories } = buildCategoryTree(
    categoriaTermsRaw,
    sortedProducts,
    (p) => p.categoriaSlugs,
    (p, slug) => labelAt(p.categoriaSlugs, p.categoriaLabels, slug),
  );

  const brands = buildTaxonomyGroups(
    marcaTermsRaw,
    sortedProducts,
    (p) => p.marcaSlugs,
    (p, slug) => labelAt(p.marcaSlugs, p.marcaLabels, slug),
  );

  const characters = buildTaxonomyGroups(
    personajeTermsRaw,
    sortedProducts,
    (p) => p.personajeSlugs,
    (p, slug) => labelAt(p.personajeSlugs, p.personajeLabels, slug),
  );

  const stores = buildStores(tiendasActivas, sortedProducts);

  const catalogPages: CatalogPage[] = pages.map((p) => ({
    slug: p.slug,
    title: p.data.title,
    content: p.data.content,
    seo: p.seo,
  }));

  const catalog: Catalog = {
    products: sortedProducts,
    productsBySlug: Object.fromEntries(sortedProducts.map((p) => [p.slug, p])),
    categories,
    allCategories,
    categoriesBySlug: Object.fromEntries(allCategories.map((c) => [c.slug, c])),
    brands,
    brandsBySlug: Object.fromEntries(brands.map((b) => [b.slug, b])),
    characters,
    charactersBySlug: Object.fromEntries(characters.map((c) => [c.slug, c])),
    stores,
    storesBySlug: Object.fromEntries(stores.map((s) => [s.slug, s])),
    collections,
    collectionsBySlug: Object.fromEntries(collections.map((c) => [c.slug, c])),
    pages: catalogPages,
    pagesBySlug: Object.fromEntries(catalogPages.map((p) => [p.slug, p])),
    tiendas: tiendasActivas,
    emdashUrl,
  };

  writeCatalogIndex(catalog);
  writeSitemapLastmod(catalog);
  return catalog;
}

const SITEMAP_LASTMOD_FILE = path.join(__dirname, '../../../.cache/sitemap-lastmod.json');

/**
 * Guarda la fecha de última modificación de cada URL para el `lastmod` del sitemap
 * (lo lee `astro.config.mjs`). Una página de listado toma la fecha del producto más
 * reciente que muestra.
 */
function writeSitemapLastmod(catalog: Catalog): void {
  if (isAstroDev()) return;

  const byId = new Map(catalog.products.map((p) => [p.id, p.updatedAt]));
  const latest = (dates: (string | undefined)[]): string | undefined =>
    dates.filter((d): d is string => Boolean(d)).sort().at(-1);
  const latestOf = (ids: string[]) => latest(ids.map((id) => byId.get(id)));

  const lastmod: Record<string, string | undefined> = {};
  const all = latest(catalog.products.map((p) => p.updatedAt));
  for (const p of ['/', '/categorias', '/colecciones', '/marcas', '/personajes', '/tiendas']) {
    lastmod[p] = all;
  }
  for (const p of catalog.products) lastmod[`/producto/${p.slug}`] = p.updatedAt;
  for (const c of catalog.allCategories) lastmod[`/categoria/${c.slug}`] = latestOf(c.productIds);
  for (const b of catalog.brands) lastmod[`/marca/${b.slug}`] = latestOf(b.productIds);
  for (const c of catalog.characters) lastmod[`/personaje/${c.slug}`] = latestOf(c.productIds);
  for (const s of catalog.stores) lastmod[`/tienda/${s.slug}`] = latestOf(s.productIds);
  for (const c of catalog.collections) lastmod[`/coleccion/${c.slug}`] = latestOf(c.productIds);

  const clean = Object.fromEntries(Object.entries(lastmod).filter(([, d]) => d));
  mkdirSync(path.dirname(SITEMAP_LASTMOD_FILE), { recursive: true });
  writeFileSync(SITEMAP_LASTMOD_FILE, JSON.stringify(clean), 'utf-8');
}

function writeCatalogIndex(catalog: Catalog): void {
  const allowWrite = env('WRITE_CATALOG_INDEX') === '1';
  if (isAstroDev() && !allowWrite) return;

  const index: CatalogSearchEntry[] = catalog.products.map((p) => ({
    slug: p.slug,
    title: p.title,
    resumen: p.resumen,
    coleccionSlugs: p.coleccionSlugs,
    precioRef: p.precioRef,
  }));
  const filePath = path.join(PUBLIC_DIR, 'catalog-index.json');
  const payload = JSON.stringify(index);
  mkdirSync(PUBLIC_DIR, { recursive: true });
  try {
    if (readFileSync(filePath, 'utf-8') === payload) return;
  } catch {
    /* archivo nuevo */
  }
  writeFileSync(filePath, payload, 'utf-8');
}

let cached: Catalog | null = null;

export async function getCatalog(): Promise<Catalog> {
  if (isAstroDev()) cached = null;
  if (!cached) cached = await buildCatalog();
  return cached;
}
