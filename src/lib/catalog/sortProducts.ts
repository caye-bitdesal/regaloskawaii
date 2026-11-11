import type { CatalogProduct } from '../emdash/types';

/** Mayor prioridad primero; luego destacado; luego título. */
export function compareProducts(a: CatalogProduct, b: CatalogProduct): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
  return a.title.localeCompare(b.title, 'es');
}

/** Copia ordenada para listados (grids, relacionados, etc.). */
export function sortProducts(products: readonly CatalogProduct[]): CatalogProduct[] {
  return [...products].sort(compareProducts);
}
