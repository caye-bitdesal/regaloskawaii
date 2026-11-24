import type { Catalog, CatalogProduct } from '../emdash/types';

/**
 * Resuelve un producto citado en una guía. Si falta, no tiene foto o prioridad 0, no se muestra
 * y se avisa en consola (la build no debe fallar).
 */
export function resolveGuiaProduct(
  slug: string,
  catalog: Catalog,
  guiaSlug: string,
): CatalogProduct | undefined {
  const product = catalog.productsBySlug[slug];
  if (!product) {
    console.warn(`[guía ${guiaSlug}] Producto no encontrado en el catálogo: ${slug}`);
    return undefined;
  }
  if (!product.imagenUrl) {
    console.warn(`[guía ${guiaSlug}] Producto sin imagen: ${slug}`);
    return undefined;
  }
  if (product.priority < 1) {
    console.warn(`[guía ${guiaSlug}] Producto con prioridad 0 (no se muestra): ${slug}`);
    return undefined;
  }
  return product;
}