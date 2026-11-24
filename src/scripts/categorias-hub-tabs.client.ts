import { initHubTabs } from './hub-tabs.client';

let initialized = false;

export function initCategoriasHubTabs(): void {
  if (initialized) return;
  initialized = true;
  initHubTabs('categorias-hub', ['producto', 'marcas', 'personajes', 'tiendas'], {
    defaultTab: 'producto',
    omitParamOn: 'producto',
  });
}