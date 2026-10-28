import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchAllItems,
  fetchCollectionProductRefs,
  fetchProductStoreRefs,
  getEmDashBaseUrl,
} from '../emdash/client';
import {
  affiliateUrl,
  booleanFrom01,
  productImageUrl,
  stripInternalProductFields,
} from '../emdash/helpers';
import type {
  Catalog,
  CatalogCollection,
  CatalogPage,
  CatalogProduct,
  CatalogSearchEntry,
  ColeccionEntry,
  PageEntry,
  ProductoEntry,
  TiendaEntry,
} from '../emdash/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../../public');

function assignCollectionsHeuristic(
  product: ProductoEntry,
  collections: ColeccionEntry[],
): string[] {
  const slugs: string[] = [];
  const price = product.data.precio_ref ?? 0;
  const title = product.data.title.toLowerCase();

  for (const col of collections) {
    const slug = col.slug;
    if (slug === 'lo-mas-viral' && booleanFrom01(product.data.destacado)) slugs.push(slug);
    if (slug === 'menos-de-10' && price > 0 && price < 10) slugs.push(slug);
    if (slug === 'de-10-a-20' && price >= 10 && price < 20) slugs.push(slug);
    if (slug === 'de-20-a-40' && price >= 20 && price <= 40) slugs.push(slug);
    if (slug === 'papeleria' && (title.includes('washi') || title.includes('papeler'))) {
      slugs.push(slug);
    }
    if (slug === 'kawaii-para-adultos' && title.includes('labubu')) slugs.push(slug);
  }

  return [...new Set(slugs)];
}

export async function buildCatalog(): Promise<Catalog> {
  const emdashUrl = getEmDashBaseUrl();

  const [productos, colecciones, tiendas, pages] = await Promise.all([
    fetchAllItems<ProductoEntry>('/_emdash/api/content/productos', '01-productos-lista.json'),
    fetchAllItems<ColeccionEntry>(
      '/_emdash/api/content/colecciones',
      '07-colecciones-lista.json',
    ),
    fetchAllItems<TiendaEntry>('/_emdash/api/content/tiendas', '09-tiendas-lista.json'),
    fetchAllItems<PageEntry>('/_emdash/api/content/pages', '10-paginas-lista.json'),
  ]);

  const tiendasActivas = tiendas.filter((t) => booleanFrom01(t.data.activa));
  const defaultTienda = tiendasActivas[0];

  const collectionProductIds = new Map<string, Set<string>>();
  for (const col of colecciones) {
    const refs = await fetchCollectionProductRefs(col.id);
    const ids = new Set(refs.map((r) => r.id));
    collectionProductIds.set(col.id, ids);
  }

  const productCollectionSlugs = new Map<string, string[]>();

  for (const product of productos) {
    const slugsFromRefs: string[] = [];
    for (const col of colecciones) {
      const ids = collectionProductIds.get(col.id);
      if (ids?.has(product.id)) slugsFromRefs.push(col.slug);
    }
    const heuristic = assignCollectionsHeuristic(product, colecciones);
    productCollectionSlugs.set(product.id, [...new Set([...slugsFromRefs, ...heuristic])]);
  }

  const products: CatalogProduct[] = [];

  for (const raw of productos) {
    const data = stripInternalProductFields(raw.data);
    const coleccionSlugs = productCollectionSlugs.get(raw.id) ?? [];
    const coleccionTitles = coleccionSlugs
      .map((s) => colecciones.find((c) => c.slug === s)?.data.title)
      .filter(Boolean) as string[];

    let tienda = defaultTienda;
    const storeRefs = await fetchProductStoreRefs(raw.id);
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
      imagenUrl: productImageUrl(data, emdashUrl),
      imagenAlt: data.imagen?.alt ?? data.title,
      destacado: booleanFrom01(data.destacado),
      coleccionSlugs,
      coleccionTitles,
      tiendaId: tienda.id,
      tiendaTitle: tienda.data.title,
      affiliateUrl: affiliateUrl(data.id_externo, tienda.data),
      seo: raw.seo,
    });
  }

  products.sort((a, b) => {
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });

  const collections: CatalogCollection[] = colecciones
    .map((col) => ({
      id: col.id,
      slug: col.slug,
      title: col.data.title,
      descripcion: col.data.descripcion ?? '',
      orden: col.data.orden,
      destacada: booleanFrom01(col.data.destacada),
      productIds: products.filter((p) => p.coleccionSlugs.includes(col.slug)).map((p) => p.id),
    }))
    .sort((a, b) => a.orden - b.orden);

  const catalogPages: CatalogPage[] = pages.map((p) => ({
    slug: p.slug,
    title: p.data.title,
    content: p.data.content,
    seo: p.seo,
  }));

  const catalog: Catalog = {
    products,
    productsBySlug: Object.fromEntries(products.map((p) => [p.slug, p])),
    collections,
    collectionsBySlug: Object.fromEntries(collections.map((c) => [c.slug, c])),
    pages: catalogPages,
    pagesBySlug: Object.fromEntries(catalogPages.map((p) => [p.slug, p])),
    tiendas: tiendasActivas,
    emdashUrl,
  };

  writeCatalogIndex(catalog);
  return catalog;
}

function writeCatalogIndex(catalog: Catalog): void {
  const index: CatalogSearchEntry[] = catalog.products.map((p) => ({
    slug: p.slug,
    title: p.title,
    resumen: p.resumen,
    coleccionSlugs: p.coleccionSlugs,
    precioRef: p.precioRef,
  }));
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(path.join(PUBLIC_DIR, 'catalog-index.json'), JSON.stringify(index), 'utf-8');
}

let cached: Catalog | null = null;

export async function getCatalog(): Promise<Catalog> {
  if (!cached) cached = await buildCatalog();
  return cached;
}
