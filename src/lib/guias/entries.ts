import { getCollection, getEntry } from 'astro:content';

export type GuiaEntry = Awaited<ReturnType<typeof getCollection<'guias'>>>[number];

/** Colecciones por tramo de precio enlazadas desde las guías. */
export const PRICE_COLLECTION_SLUGS = ['menos-de-10', 'de-10-a-20', 'de-20-a-40'] as const;

export function sortGuiasByActualizado(entries: GuiaEntry[]): GuiaEntry[] {
  return [...entries].sort((a, b) => b.data.actualizado.getTime() - a.data.actualizado.getTime());
}

export async function loadGuiasRelacionadas(
  slugs: string[] | undefined,
  currentId: string,
): Promise<GuiaEntry[]> {
  if (!slugs?.length) return [];
  const related: GuiaEntry[] = [];
  for (const id of slugs) {
    if (id === currentId) continue;
    const entry = await getEntry('guias', id);
    if (entry) related.push(entry);
  }
  return sortGuiasByActualizado(related);
}

export function guiasForColeccionSlugFrom(
  all: GuiaEntry[],
  collectionSlug: string,
): GuiaEntry[] {
  return sortGuiasByActualizado(
    all.filter((g) => g.data.colecciones?.includes(collectionSlug)),
  );
}

export async function guiasForColeccionSlug(collectionSlug: string): Promise<GuiaEntry[]> {
  const all = await getCollection('guias');
  return guiasForColeccionSlugFrom(all, collectionSlug);
}

/** Guías de regalo asociadas a alguna colección por precio (p. ej. portada). */
export function guiasLinkedToPriceCollections(all: GuiaEntry[]): GuiaEntry[] {
  const priceSet = new Set<string>(PRICE_COLLECTION_SLUGS);
  return sortGuiasByActualizado(
    all.filter((g) => g.data.colecciones?.some((slug) => priceSet.has(slug))),
  );
}