const STORAGE_KEY = 'regaloskawaii:favorites';

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setFavorites(slugs: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
}

function updateButton(btn: HTMLButtonElement, active: boolean): void {
  btn.textContent = active ? '♥' : '♡';
  btn.classList.toggle('text-rk-pink', active);
}

let initialized = false;

export function initFavoriteButtons(): void {
  if (initialized) return;
  initialized = true;

  const syncAll = () => {
    const favs = new Set(getFavorites());
    document.querySelectorAll<HTMLButtonElement>('.favorite-btn[data-favorite-slug]').forEach((btn) => {
      const slug = btn.dataset.favoriteSlug;
      if (slug) updateButton(btn, favs.has(slug));
    });
  };

  syncAll();

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.favorite-btn') as HTMLButtonElement | null;
    if (!target?.dataset.favoriteSlug) return;
    e.preventDefault();
    e.stopPropagation();
    const slug = target.dataset.favoriteSlug;
    const favs = getFavorites();
    const idx = favs.indexOf(slug);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(slug);
    setFavorites(favs);
    updateButton(target, favs.includes(slug));
  });
}
