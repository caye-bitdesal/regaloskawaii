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
      const on = btn === active;
      btn.classList.toggle('bg-rk-pink', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('bg-white', !on);
      btn.classList.toggle('text-gray-700', !on);
      btn.classList.toggle('ring-1', !on);
      btn.classList.toggle('ring-gray-200', !on);
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
