let initialized = false;

export function initCategoryCollectionFilter(): void {
  if (initialized) return;
  initialized = true;

  const container = document.getElementById('filter-chips');
  if (!container) return;

  const gridId = container.dataset.gridId ?? 'product-grid';
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-filter]');

  const applyFilter = (filter: string, pushUrl: boolean) => {
    buttons.forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.filter ?? 'all') === filter);
    });
    grid.querySelectorAll<HTMLElement>('.product-card').forEach((card) => {
      if (filter === 'all') {
        card.classList.remove('hidden');
        return;
      }
      const cols = (card.dataset.colecciones ?? '').split(',').filter(Boolean);
      card.classList.toggle('hidden', !cols.includes(filter));
    });
    if (!pushUrl) return;
    const url = new URL(window.location.href);
    if (filter === 'all') url.searchParams.delete('coleccion');
    else url.searchParams.set('coleccion', filter);
    window.history.replaceState({}, '', url);
  };

  const initial = new URLSearchParams(window.location.search).get('coleccion') ?? 'all';
  applyFilter(initial, false);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFilter(btn.dataset.filter ?? 'all', true);
    });
  });
}
