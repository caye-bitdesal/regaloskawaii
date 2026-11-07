import type { CatalogCategory, CatalogProduct, CatalogTaxonomy, TaxonomyTerm } from '../emdash/types';

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

/**
 * Categorías con subcategorías. Un producto de una subcategoría cuenta también en todas
 * sus categorías superiores, así que basta con asignarle la más concreta.
 * Las que no tienen productos no aparecen.
 */
export function buildCategoryTree(
  termsRaw: TaxonomyTerm[],
  products: CatalogProduct[],
  slugsOf: (product: CatalogProduct) => string[],
  labelsOf: (product: CatalogProduct, slug: string) => string,
): { categories: CatalogCategory[]; allCategories: CatalogCategory[] } {
  // parentId apunta al id o al translationGroup del padre.
  const slugByRef = new Map<string, string>();
  for (const t of termsRaw) {
    slugByRef.set(t.id, t.slug);
    if (t.translationGroup) slugByRef.set(t.translationGroup, t.slug);
  }

  const bySlug = new Map<string, CatalogCategory>();
  for (const t of termsRaw) {
    bySlug.set(t.slug, {
      id: t.id,
      slug: t.slug,
      label: t.label,
      parentSlug: t.parentId ? slugByRef.get(t.parentId) ?? null : null,
      children: [],
      count: 0,
      productIds: [],
    });
  }

  const add = (slug: string, productId: string, seen: Set<string>) => {
    if (seen.has(slug)) return; // evita ciclos
    seen.add(slug);
    const group = bySlug.get(slug);
    if (!group) return;
    if (!group.productIds.includes(productId)) group.productIds.push(productId);
    if (group.parentSlug) add(group.parentSlug, productId, seen);
  };

  for (const product of products) {
    for (const slug of slugsOf(product)) {
      if (!bySlug.has(slug)) {
        bySlug.set(slug, {
          id: slug,
          slug,
          label: labelsOf(product, slug),
          parentSlug: null,
          children: [],
          count: 0,
          productIds: [],
        });
      }
      add(slug, product.id, new Set());
    }
  }

  const byLabel = (a: CatalogCategory, b: CatalogCategory) => a.label.localeCompare(b.label, 'es');
  const allCategories = [...bySlug.values()]
    .map((c) => Object.assign(c, { count: c.productIds.length }))
    .filter((c) => c.count > 0)
    .sort(byLabel);
  for (const c of allCategories) {
    const parent = c.parentSlug ? bySlug.get(c.parentSlug) : undefined;
    if (parent && parent.count > 0) parent.children.push(c);
  }
  const categories = allCategories.filter((c) => !c.parentSlug || !bySlug.get(c.parentSlug)?.count);
  return { categories, allCategories };
}
