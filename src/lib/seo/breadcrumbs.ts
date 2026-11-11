export type BreadcrumbItem = { name: string; path: string };

export const HOME_CRUMB: BreadcrumbItem = { name: 'Inicio', path: '/' };

export function crumb(name: string, path: string): BreadcrumbItem {
  return { name, path };
}

/** Inicio → hub → página actual */
export function hubTrail(
  hubName: string,
  hubPath: string,
  currentName: string,
  currentPath: string,
): BreadcrumbItem[] {
  return [HOME_CRUMB, crumb(hubName, hubPath), crumb(currentName, currentPath)];
}
