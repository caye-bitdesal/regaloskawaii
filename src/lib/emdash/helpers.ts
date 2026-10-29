import { env } from '../runtime/env';
import type { EmDashBool, EmDashImage, ProductoData, TiendaData } from './types';

export function booleanFrom01(value: EmDashBool | undefined): boolean {
  return value === 1;
}

export function getEmdashUrl(): string {
  return (env('EMDASH_URL') ?? 'http://localhost:4321').replace(/\/$/, '');
}

export function mediaUrl(storageKey: string, emdashUrl = getEmdashUrl()): string {
  return `${emdashUrl}/_emdash/api/media/file/${storageKey}`;
}

export function productImageUrl(data: ProductoData, emdashUrl = getEmdashUrl()): string | undefined {
  const key = data.imagen?.meta.storageKey;
  return key ? mediaUrl(key, emdashUrl) : undefined;
}

export function affiliateUrl(
  idExterno: string,
  tienda: TiendaData,
): string {
  return tienda.plantilla_url
    .replace('{id}', encodeURIComponent(idExterno))
    .replace('{tag}', encodeURIComponent(tienda.tag_web));
}

export function stripInternalProductFields(data: ProductoData): ProductoData {
  const { notas: _n, para_grabar: _p, ...rest } = data;
  return rest as ProductoData;
}

export function formatPriceEur(value: number | undefined): string | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function collectionAbbrev(title: string): string {
  const words = title.replace(/€/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  const nums = title.match(/\d+/g);
  if (title.includes('menos de') && nums?.[0]) return nums[0];
  if (title.match(/de \d+ a \d+/i) && nums?.[0]) return nums[0];
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function imageAlt(img: EmDashImage | undefined, fallback: string): string {
  return img?.alt ?? fallback;
}
