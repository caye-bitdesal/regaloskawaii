import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SNAPSHOT_PATH } from '../src/lib/content/snapshot.ts';
import { runSyncContent } from '../src/lib/content/runSync.ts';
import { loadDotEnv } from './load-dotenv.ts';
import { explainEmDashSyncError } from './explain-emdash-sync-error.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadDotEnv(root);

const hasToken = Boolean(process.env.EMDASH_TOKEN);
const hasCache = existsSync(SNAPSHOT_PATH);
const refresh = process.env.REFRESH_CONTENT === '1';

if (hasToken) {
  if (!hasCache || refresh) {
    console.log(
      refresh
        ? 'REFRESH_CONTENT=1 → sincronizando desde EmDash…'
        : 'Primera sync: descargando contenido e imágenes…',
    );
    try {
      const result = await runSyncContent();
      console.log(
        `Sync: ${result.products} productos, ${result.imagesOk} imágenes` +
          (result.imagesFailed.length ? ` (${result.imagesFailed.length} fallidas)` : ''),
      );
      if (result.imagesFailed.length) process.exit(1);
    } catch (err) {
      console.error(explainEmDashSyncError(err));
      if (hasCache) {
        console.warn(
          'Sync fallida → sigo con la caché en .cache/content (quita REFRESH_CONTENT=1 para no reintentar cada vez).',
        );
      } else {
        console.error(
          'No hay caché local todavía: arranca EmDash, ejecuta npm run sync-content, o quita el token y usa fixtures.',
        );
        process.exit(1);
      }
    }
  } else {
    console.log('Usando caché local (.cache/content). Para refrescar: REFRESH_CONTENT=1 npm run dev');
  }
  process.env.EMDASH_CONTENT_CACHE = '1';
  process.env.EMDASH_USE_FIXTURES = '0';
} else {
  console.log('Sin EMDASH_TOKEN → datos de fixtures/emdash (pon token en .env para EmDash).');
  process.env.EMDASH_USE_FIXTURES = '1';
  process.env.EMDASH_CONTENT_CACHE = '0';
}

const port = process.env.PORT ?? '4322';
const r = spawnSync('npx', ['astro', 'dev', '--port', port, '--host', '--force'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
