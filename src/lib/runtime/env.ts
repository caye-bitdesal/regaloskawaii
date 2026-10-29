/** Variables de entorno (Node o Vite/Astro). */
export function env(name: string): string | undefined {
  return (typeof import.meta !== 'undefined' && import.meta.env?.[name]) || process.env[name];
}

/** true solo dentro de `astro dev` / build de Vite. */
export function isAstroDev(): boolean {
  return import.meta.env?.DEV === true;
}

export function isAstroProd(): boolean {
  return import.meta.env?.PROD === true;
}
