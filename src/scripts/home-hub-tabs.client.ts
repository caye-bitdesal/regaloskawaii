let initialized = false;

export function initHomeHubTabs(): void {
  if (initialized) return;
  initialized = true;

  const root = document.getElementById('home-hub');
  if (!root) return;

  const panels = root.querySelectorAll<HTMLElement>('[data-hub-panel]');
  const tabs = root.querySelectorAll<HTMLButtonElement>('button[data-hub-tab]');

  const show = (name: string) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.hubTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.hubPanel !== name;
    });
    const url = new URL(window.location.href);
    if (name === 'colecciones') url.searchParams.set('ver', 'colecciones');
    else url.searchParams.delete('ver');
    window.history.replaceState({}, '', url);
  };

  const initial = new URLSearchParams(window.location.search).get('ver') === 'colecciones'
    ? 'colecciones'
    : 'categorias';
  show(initial);

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.hubTab ?? 'categorias';
      show(name);
    });
  });
}
