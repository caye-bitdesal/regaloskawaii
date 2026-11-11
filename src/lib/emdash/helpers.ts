import { env } from '../runtime/env';
import { leerHistorial, precioAnterior30d } from './priceHistory';
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

/**
 * Orden en la web (mayor primero). Siempre 0, aunque haya otra guardada: sin foto, o de
 * AliExpress sin enlace de afiliado (fuera del programa: no da comisión). Así salen al final.
 * Misma regla que calcularPrioridad en scripts/lib/product-priority.mjs del admin.
 */
export function prioridadProducto(
  data: Pick<ProductoData, 'tipo' | 'enlace_afiliado' | 'priority' | 'imagen'>,
  tienda: Pick<TiendaData, 'plantilla_url' | 'title' | 'tag_web'>,
): number {
  const enlace = data.enlace_afiliado?.trim() ?? '';
  const amazon = /amazon\./i.test(tienda.plantilla_url) || /amazon/i.test(tienda.title);
  const aliexpress = /aliexpress/i.test(tienda.plantilla_url) || /aliexpress/i.test(tienda.title);
  const afiliadoAliExpress =
    /(^|\.)s\.click\.aliexpress\./i.test(enlace) || enlace.includes('aff_fcid') || enlace.includes('aff_fsk');
  if (!data.imagen?.meta?.storageKey) return 0;
  if (aliexpress && !afiliadoAliExpress) return 0;

  const almacenada = data.priority ?? (data as ProductoData & { prioridad?: number }).prioridad;
  if (almacenada != null && Number.isFinite(almacenada)) return almacenada;
  if (data.tipo === 'oficial') return 2;
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
  return afiliadoAliExpress ? 1 : 0;
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

/** Días que se enseña un descuento después de consultar el precio. */
export const DIAS_DESCUENTO_VIGENTE = 7;

/**
 * Descuento que se puede anunciar: el precio actual es al menos un 1 % menor que el más
 * bajo de los 30 días anteriores a la consulta (art. 20 Ley 7/1996), según el historial
 * de precios, y la consulta tiene DIAS_DESCUENTO_VIGENTE días o menos. Nunca se usa el
 * «precio original» de la tienda ni se inventa un precio anterior.
 */
export function descuentoVigente(
  producto: Pick<ProductoData, 'precio_ref' | 'precio_actualizado' | 'historial_precios'>,
  ahora: Date = new Date(),
): { precioAnterior: number; porcentaje: number; fecha: string } | undefined {
  const { precio_ref: precio, precio_actualizado: fecha } = producto;
  if (!precio || !fecha) return undefined;
  const consultado = new Date(fecha);
  if (Number.isNaN(consultado.getTime())) return undefined;
  const dias = (ahora.getTime() - consultado.getTime()) / 86_400_000;
  if (dias < 0 || dias > DIAS_DESCUENTO_VIGENTE) return undefined;

  const anterior = precioAnterior30d(leerHistorial(producto.historial_precios), consultado.toISOString().slice(0, 10));
  if (!anterior || !(precio < anterior * 0.99)) return undefined;
  return {
    precioAnterior: anterior,
    porcentaje: Math.round((1 - precio / anterior) * 100),
    fecha: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Madrid' }).format(
      consultado,
    ),
  };
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
