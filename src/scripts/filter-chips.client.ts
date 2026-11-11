let initialized = false;

export function initFilterChips(): void {
  if (initialized) return;
  initialized = true;

  const container = document.getElementById('filter-chips');
  if (!container) return;

  const gridId = container.dataset.gridId ?? 'product-grid';
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const collectionBlocks = container.dataset.collectionBlocks === 'true';
  const shopFilter = container.dataset.shopFilter === 'true';
  const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-filter]');

  const setActive = (active: HTMLButtonElement) => {
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn === active);
    });
  };

  const applyFilter = (filter: string) => {
    if (collectionBlocks) {
      grid.querySelectorAll<HTMLElement>('.collection-block').forEach((block) => {
        if (filter === 'all') {
          block.classList.remove('hidden');
          return;
        }
        block.classList.toggle('hidden', block.dataset.collection !== filter);
      });
      return;
    }
    grid.querySelectorAll<HTMLElement>('.product-card').forEach((card) => {
      if (filter === 'all') {
        card.classList.remove('hidden');
        return;
      }
      if (shopFilter) {
        card.classList.toggle('hidden', card.dataset.tienda !== filter);
        return;
      }
      const cols = (card.dataset.colecciones ?? '').split(',').filter(Boolean);
      card.classList.toggle('hidden', !cols.includes(filter));
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActive(btn);
      applyFilter(btn.dataset.filter ?? 'all');
    });
  });
}
