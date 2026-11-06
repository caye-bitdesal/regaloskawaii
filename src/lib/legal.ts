/**
 * Datos del titular de la web para las páginas legales (LSSI art. 10 y RGPD art. 13).
 * Revísalos antes de publicar: los marcados «PENDIENTE» hay que rellenarlos.
 */
export const LEGAL = {
  /** Nombre y apellidos o razón social del titular. */
  titular: 'PENDIENTE: nombre o razón social',
  /** NIF / CIF. */
  nif: 'PENDIENTE: NIF',
  /** Domicilio completo. */
  domicilio: 'PENDIENTE: domicilio (calle, número, CP, ciudad)',
  /** Solo si el titular es una sociedad; si es una persona física, deja ''. */
  registroMercantil: 'PENDIENTE: Registro Mercantil de …, tomo …, folio …, hoja …',
  email: 'hola@regaloskawaii.es',
  web: 'https://regaloskawaii.es',
  /** Fecha de la última revisión de los textos. */
  actualizado: '6 de noviembre de 2026',
} as const;

/** true si queda algún dato sin rellenar (se muestra un aviso en la página). */
export const LEGAL_PENDIENTE = Object.values(LEGAL).some((v) => typeof v === 'string' && v.startsWith('PENDIENTE'));
