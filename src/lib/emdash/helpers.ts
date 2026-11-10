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

export function prioridadProducto(
  data: Pick<ProductoData, 'tipo' | 'enlace_afiliado' | 'priority'>,
  tienda: Pick<TiendaData, 'plantilla_url' | 'title' | 'tag_web'>,
): number {
  const almacenada = data.priority ?? (data as ProductoData & { prioridad?: number }).prioridad;
  if (almacenada != null && Number.isFinite(almacenada)) return almacenada;
  if (data.tipo === 'oficial') return 2;
  const enlace = data.enlace_afiliado?.trim() ?? '';
  const amazon = /amazon\./i.test(tienda.plantilla_url) || /amazon/i.test(tienda.title);
  if (amazon) {
    if (enlace) {
      try {
        if (!new URL(enlace).searchParams.get('tag')) return 0;
      } catch {
        return 0;
      }
    }
    return 1;
  }
  if (/(^|\.)s\.click\.aliexpress\./i.test(enlace)) return 1;
  if (enlace.includes('aff_fcid') || enlace.includes('aff_fsk')) return 1;
  return 0;
}

export function affiliateUrl(
  producto: Pick<ProductoData, 'id_externo' | 'enlace_afiliado'>,
  tienda: TiendaData,
): string {
  if (producto.enlace_afiliado?.trim()) {
    return producto.enlace_afiliado.trim();
  }
  return tienda.plantilla_url
    .replace('{id}', encodeURIComponent(producto.id_externo))
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
