import type { CatalogProduct } from '../emdash/types';
import { LEGAL } from '../legal';
import type { BreadcrumbItem } from './breadcrumbs';

const SITE_NAME = 'Regalos Kawaii';

export function absoluteUrl(siteOrigin: URL, path: string): string {
  return new URL(path, siteOrigin).href;
}

export function breadcrumbsJsonLd(items: BreadcrumbItem[], siteOrigin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(siteOrigin, item.path),
    })),
  };
}

export function itemListJsonLd(products: CatalogProduct[], siteOrigin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(siteOrigin, `/producto/${product.slug}`),
    })),
  };
}

export function websiteJsonLd(siteOrigin: URL, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteOrigin.href,
    description,
    inLanguage: 'es-ES',
    publisher: {
      '@type': 'Organization',
      name: LEGAL.titular,
      url: LEGAL.web,
    },
  };
}

export function organizationJsonLd(siteOrigin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Regalos Kawaii',
    legalName: LEGAL.titular,
    url: LEGAL.web,
    email: LEGAL.email,
    logo: absoluteUrl(siteOrigin, '/favicon.svg'),
  };
}

/** Categorías con menos productos no se indexan hasta tener más contenido. */
export const MIN_CATEGORY_PRODUCTS_FOR_INDEX = 3;
