/**
 * Historial de precios (campo «historial_precios» de EmDash, JSON [["AAAA-MM-DD", precio], …]
 * con un elemento por cambio de precio). Mismo cálculo que scripts/lib/price-history.mjs
 * del admin, que es quien lo rellena.
 *
 * Precio anterior de una rebaja (art. 20 Ley 7/1996 de Ordenación del Comercio Minorista):
 * el más bajo de los 30 días anteriores. Sin 30 días de historial no se anuncia descuento.
 */
export type HistorialPrecios = [string, number][];

const DIAS_VENTANA = 30;
const DIA_MS = 86_400_000;
const sumarDias = (fecha: string, dias: number) =>
  new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

export function leerHistorial(texto: string | undefined): HistorialPrecios {
  if (!texto) return [];
  try {
    const lista: unknown = JSON.parse(texto);
    if (!Array.isArray(lista)) return [];
    return (lista as unknown[])
      .filter(
        (e): e is [string, number] =>
          Array.isArray(e) &&
          typeof e[0] === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(e[0]) &&
          typeof e[1] === 'number' &&
          Number.isFinite(e[1]) &&
          e[1] > 0,
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
  } catch {
    return [];
  }
}

/** Precio más bajo de los 30 días anteriores a `dia` (sin contar ese día); undefined sin 30 días de datos. */
export function precioAnterior30d(historial: HistorialPrecios, dia: string): number | undefined {
  const inicio = sumarDias(dia, -DIAS_VENTANA);
  const antes = historial.filter((e) => e[0] < dia);
  const alInicio = antes.filter((e) => e[0] <= inicio).at(-1);
  if (!alInicio) return undefined;
  return Math.min(alInicio[1], ...antes.filter((e) => e[0] > inicio).map((e) => e[1]));
}
