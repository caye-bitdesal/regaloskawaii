import { initHubTabs } from './hub-tabs.client';

let initialized = false;

export function initHomeHubTabs(): void {
  if (initialized) return;
  initialized = true;
  initHubTabs('home-hub', ['categorias', 'colecciones'], {
    defaultTab: 'categorias',
    omitParamOn: 'categorias',
  });
}