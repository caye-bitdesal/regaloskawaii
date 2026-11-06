/**
 * Datos del titular de la web para las páginas legales (LSSI art. 10 y RGPD art. 13).
 */
export const LEGAL = {
  /** Nombre y apellidos o razón social del titular. */
  titular: 'Bitdesal S.L.',
  /** NIF / CIF. */
  nif: 'B23953029',
  /** Domicilio completo. */
  domicilio: 'Partida Daimes 2146. Elx',
  email: 'hola@regaloskawaii.es',
  web: 'https://regaloskawaii.es',
  /** Fecha de la última revisión de los textos. */
  actualizado: '6 de noviembre de 2026',
} as const;

/** true si queda algún dato sin rellenar (se muestra un aviso en la página). */
export const LEGAL_PENDIENTE = Object.values(LEGAL).some((v) => typeof v === 'string' && v.startsWith('PENDIENTE'));
