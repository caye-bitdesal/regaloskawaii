# Regalos Kawaii

Catálogo estático (Astro) con datos de EmDash e imágenes locales.

## Uso local

```bash
cp .env.example .env   # EMDASH_URL + EMDASH_TOKEN del admin
npm install
npm run dev            # http://localhost:4322
```

**Qué hace `npm run dev`:**

1. Si hay `EMDASH_TOKEN` y aún no hay caché → descarga contenido + imágenes (una vez).
2. Si ya existe `.cache/content/` → usa eso (sin llamadas JSON a la API).
3. Las fotos se sirven desde `/media/...` en `public/media/`.
4. Sin token → datos de ejemplo en `fixtures/emdash/`.

Admin EmDash en **4321**, web en **4322** (cambiable con `PORT` en `.env`).

Refrescar datos desde EmDash (el **admin tiene que estar en marcha**, p. ej. en el 4321):

```bash
REFRESH_CONTENT=1 npm run dev
# o
npm run sync-content
```

Si pides refresh con el admin parado pero ya tienes `.cache/content/`, `npm run dev` arranca igual usando la caché.

## Producción

```bash
npm run build    # usa la caché; sync automático si hay token y no hay caché
npm run preview
```

Sube la carpeta `dist/` a cualquier hosting estático. No hace falta systemd ni cron en el servidor: sincroniza en tu PC o CI antes de desplegar.

Spec: `specs/regaloskawaii-web/spec.html`.
