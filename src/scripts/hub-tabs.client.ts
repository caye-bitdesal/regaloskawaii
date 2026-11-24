const instances = new Set<string>();

export function initHubTabs(
  rootId: string,
  validTabs: string[],
  options?: { defaultTab?: string; paramName?: string; omitParamOn?: string },
): void {
  if (instances.has(rootId)) return;
  instances.add(rootId);

  const root = document.getElementById(rootId);
  if (!root) return;

  const paramName = options?.paramName ?? 'ver';
  const defaultTab = options?.defaultTab ?? validTabs[0] ?? 'categorias';
  const omitParamOn = options?.omitParamOn;
  const tabSet = new Set(validTabs);

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
    if (omitParamOn && name === omitParamOn) url.searchParams.delete(paramName);
    else url.searchParams.set(paramName, name);
    window.history.replaceState({}, '', url);
  };

  const fromUrl = new URLSearchParams(window.location.search).get(paramName) ?? defaultTab;
  const initial = tabSet.has(fromUrl) ? fromUrl : defaultTab;
  show(initial);

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.hubTab ?? defaultTab;
      if (tabSet.has(name)) show(name);
    });
  });
}