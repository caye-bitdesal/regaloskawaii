import type { CatalogProduct, CatalogTaxonomy, TaxonomyTerm } from '../emdash/types';

export function buildTaxonomyGroups(
  termsRaw: TaxonomyTerm[],
  products: CatalogProduct[],
  slugsOf: (product: CatalogProduct) => string[],
  labelsOf: (product: CatalogProduct, slug: string) => string,
): CatalogTaxonomy[] {
  const bySlug = new Map<
    string,
    { id: string; slug: string; label: string; productIds: string[] }
  >();

  for (const term of termsRaw) {
    bySlug.set(term.slug, {
      id: term.id,
      slug: term.slug,
      label: term.label,
      productIds: [],
    });
  }

  for (const product of products) {
    for (const slug of slugsOf(product)) {
      let group = bySlug.get(slug);
      if (!group) {
        group = {
          id: slug,
          slug,
          label: labelsOf(product, slug),
          productIds: [],
        };
        bySlug.set(slug, group);
      }
      if (!group.productIds.includes(product.id)) group.productIds.push(product.id);
    }
  }

  return [...bySlug.values()]
    .map((item) => ({
      ...item,
      count: item.productIds.length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function labelAt(slugs: string[], labels: string[], slug: string): string {
  const i = slugs.indexOf(slug);
  return i >= 0 ? labels[i] ?? slug : slug;
}
