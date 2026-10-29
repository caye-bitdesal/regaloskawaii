let initialized = false;

export function initFilterChips(): void {
  if (initialized) return;
  initialized = true;

  const container = document.getElementById('filter-chips');
  if (!container) return;

  const gridId = container.dataset.gridId ?? 'product-grid';
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-filter]');

  const setActive = (active: HTMLButtonElement) => {
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn === active);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActive(btn);
      const filter = btn.dataset.filter ?? 'all';
      grid.querySelectorAll<HTMLElement>('.product-card').forEach((card) => {
        if (filter === 'all') {
          card.classList.remove('hidden');
          return;
        }
        const cols = (card.dataset.colecciones ?? '').split(',').filter(Boolean);
        card.classList.toggle('hidden', !cols.includes(filter));
      });
    });
  });
}
