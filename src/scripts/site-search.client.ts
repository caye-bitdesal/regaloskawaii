import type { CatalogSearchEntry } from '../lib/emdash/types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

let catalogPromise: Promise<CatalogSearchEntry[]> | null = null;

function loadCatalog(): Promise<CatalogSearchEntry[]> {
  if (!catalogPromise) {
    catalogPromise = fetch('/catalog-index.json')
      .then((r) => r.json())
      .catch(() => [] as CatalogSearchEntry[]);
  }
  return catalogPromise;
}

export function initSiteSearch(): void {
  const input = document.getElementById('site-search-input') as HTMLInputElement | null;
  const results = document.getElementById('site-search-results') as HTMLUListElement | null;
  const root = document.getElementById('site-search-root');
  if (!input || !results || !root) return;

  const hide = () => {
    results.classList.add('hidden');
    results.replaceChildren();
  };

  const show = (items: CatalogSearchEntry[], query: string) => {
    results.replaceChildren();
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.style.padding = '0.5rem 0.85rem';
      li.style.fontSize = '13px';
      li.style.color = '#8a7e86';
      li.textContent = 'Sin resultados';
      results.appendChild(li);
    } else {
      for (const item of items.slice(0, 8)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `/producto/${item.slug}`;
        a.innerHTML = `<span>${highlight(item.title, query)}</span>`;
        if (item.resumen) {
          const sub = document.createElement('span');
          sub.className = 'search-sub';
          sub.textContent = item.resumen;
          a.appendChild(sub);
        }
        li.appendChild(a);
        results.appendChild(li);
      }
    }
    results.classList.remove('hidden');
  };

  function highlight(title: string, query: string): string {
    return title.replace(/</g, '&lt;');
  }

  input.addEventListener('input', async () => {
    const q = normalize(input.value.trim());
    if (q.length < 2) {
      hide();
      return;
    }
    const catalog = await loadCatalog();
    const matches = catalog.filter((p) => {
      const hay = normalize(`${p.title} ${p.resumen} ${p.coleccionSlugs.join(' ')}`);
      return hay.includes(q);
    });
    show(matches, q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    if (e.key === 'Enter') {
      const first = results.querySelector('a') as HTMLAnchorElement | null;
      if (first) {
        e.preventDefault();
        window.location.href = first.href;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) hide();
  });
}
