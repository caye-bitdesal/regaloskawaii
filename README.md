# Regalos Kawaii

Catálogo web estático (Astro) con enlaces de afiliado a tiendas externas.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Variables de entorno (solo en build; ver `.env.example`):

- `EMDASH_URL` — URL del admin EmDash
- `EMDASH_TOKEN` — token de lectura (`content:read`, `media:read`)
- `EMDASH_USE_FIXTURES=1` — usa `fixtures/emdash/` si no hay token

Spec de implementación: `specs/regaloskawaii-web/spec.html`.
