import type { ContentSnapshot } from './snapshot';
import type { ColeccionEntry, PageEntry, ProductoEntry, TiendaEntry } from '../emdash/types';
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
} from '../emdash/client';

/**
 * Descarga todo el contenido desde EmDash (requiere token; no usa fixtures ni caché).
 */
export async function fetchContentSnapshot(): Promise<ContentSnapshot> {
  const emdashUrl = getEmDashBaseUrl();

  const productIds: string[] = [];

  const [productos, colecciones, tiendas, pages, categoriaTerms, marcaTerms, personajeTerms] =
    await Promise.all([
      fetchAllItems<ProductoEntry>('/_emdash/api/content/productos', '01-productos-lista.json'),
      fetchAllItems<ColeccionEntry>(
        '/_emdash/api/content/colecciones',
        '07-colecciones-lista.json',
      ),
      fetchAllItems<TiendaEntry>('/_emdash/api/content/tiendas', '09-tiendas-lista.json'),
      fetchAllItems<PageEntry>('/_emdash/api/content/pages', '10-paginas-lista.json'),
      fetchCategoriaTerms(),
      fetchMarcaTerms(),
      fetchPersonajeTerms(),
    ]);

  productos.forEach((p) => productIds.push(p.id));

  const collectionProductRefs: ContentSnapshot['collectionProductRefs'] = {};
  for (const col of colecciones) {
    collectionProductRefs[col.id] = await fetchCollectionProductRefs(col.id);
  }

  const productStoreRefs: ContentSnapshot['productStoreRefs'] = {};
  for (const product of productos) {
    productStoreRefs[product.id] = await fetchProductStoreRefs(product.id);
  }

  const [productCategoriaTerms, productMarcaTerms, productPersonajeTerms] = await Promise.all([
    fetchAllProductCategoriaTerms(productIds),
    fetchAllProductTaxonomyTerms(productIds, 'marca'),
    fetchAllProductTaxonomyTerms(productIds, 'personaje'),
  ]);

  return {
    syncedAt: new Date().toISOString(),
    emdashUrl,
    productos,
    colecciones,
    tiendas,
    pages,
    collectionProductRefs,
    productStoreRefs,
    categoriaTerms,
    productCategoriaTerms,
    marcaTerms,
    personajeTerms,
    productMarcaTerms,
    productPersonajeTerms,
  };
}
