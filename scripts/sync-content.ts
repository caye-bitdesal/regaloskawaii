import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSyncContent } from '../src/lib/content/runSync.ts';
import { loadDotEnv } from './load-dotenv.ts';
import { explainEmDashSyncError } from './explain-emdash-sync-error.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadDotEnv(root);

if (!process.env.EMDASH_TOKEN) {
  console.error('Falta EMDASH_TOKEN en .env');
  process.exit(1);
}

console.log('Sincronizando desde', process.env.EMDASH_URL ?? 'http://localhost:4321');
try {
  const result = await runSyncContent();
  console.log(`Caché: ${result.products} productos, ${result.collections} colecciones`);
  console.log(`Imágenes: ${result.imagesOk} ok`);
  if (result.imagesFailed.length) {
    for (const k of result.imagesFailed) console.warn('  -', k);
    process.exit(1);
  }
  console.log('Listo.');
} catch (err) {
  console.error(explainEmDashSyncError(err));
  process.exit(1);
}
