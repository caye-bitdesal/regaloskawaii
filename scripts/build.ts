import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SNAPSHOT_PATH } from '../src/lib/content/snapshot.ts';
import { runSyncContent } from '../src/lib/content/runSync.ts';
import { loadDotEnv } from './load-dotenv.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadDotEnv(root);

const hasToken = Boolean(process.env.EMDASH_TOKEN);
const hasCache = existsSync(SNAPSHOT_PATH);

if (hasToken && (!hasCache || process.env.REFRESH_CONTENT === '1')) {
  console.log('Sincronizando antes del build…');
  await runSyncContent();
  process.env.EMDASH_CONTENT_CACHE = '1';
  process.env.EMDASH_USE_FIXTURES = '0';
} else if (hasCache) {
  process.env.EMDASH_CONTENT_CACHE = '1';
  process.env.EMDASH_USE_FIXTURES = '0';
} else if (hasToken) {
  process.env.EMDASH_CONTENT_CACHE = '1';
  process.env.EMDASH_USE_FIXTURES = '0';
} else {
  process.env.EMDASH_USE_FIXTURES = '1';
  process.env.EMDASH_CONTENT_CACHE = '0';
}

process.env.SYNC_MEDIA = '0';

const r = spawnSync('npx', ['astro', 'build'], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
