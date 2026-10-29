import { fetchContentSnapshot } from './fetchSnapshot';
import { writeSnapshot } from './snapshot';
import {
  collectStorageKeysFromProductos,
  syncMediaFiles,
} from '../media/syncMedia';

export interface SyncResult {
  products: number;
  collections: number;
  imagesOk: number;
  imagesFailed: string[];
}

/** API EmDash → caché JSON + imágenes en public/media (vacía la carpeta antes). */
export async function runSyncContent(): Promise<SyncResult> {
  if (!process.env.EMDASH_TOKEN) {
    throw new Error('Falta EMDASH_TOKEN en .env');
  }

  const prev = {
    force: process.env.EMDASH_FORCE_API,
    cache: process.env.EMDASH_CONTENT_CACHE,
    fixtures: process.env.EMDASH_USE_FIXTURES,
    writeIndex: process.env.WRITE_CATALOG_INDEX,
  };

  process.env.EMDASH_FORCE_API = '1';
  process.env.EMDASH_USE_FIXTURES = '0';
  process.env.EMDASH_CONTENT_CACHE = '0';

  try {
    const snapshot = await fetchContentSnapshot();
    await writeSnapshot(snapshot);

    const keys = collectStorageKeysFromProductos(snapshot.productos);
    const { ok, failed } = await syncMediaFiles(keys, snapshot.emdashUrl);

    process.env.EMDASH_FORCE_API = '0';
    process.env.EMDASH_CONTENT_CACHE = '1';
    process.env.EMDASH_USE_FIXTURES = '0';
    process.env.WRITE_CATALOG_INDEX = '1';

    const { buildCatalog } = await import('../catalog/buildCatalog.ts');
    await buildCatalog();

    return {
      products: snapshot.productos.length,
      collections: snapshot.colecciones.length,
      imagesOk: ok,
      imagesFailed: failed,
    };
  } catch (err) {
    if (prev.force === undefined) delete process.env.EMDASH_FORCE_API;
    else process.env.EMDASH_FORCE_API = prev.force;
    if (prev.cache === undefined) delete process.env.EMDASH_CONTENT_CACHE;
    else process.env.EMDASH_CONTENT_CACHE = prev.cache;
    if (prev.fixtures === undefined) delete process.env.EMDASH_USE_FIXTURES;
    else process.env.EMDASH_USE_FIXTURES = prev.fixtures;
    if (prev.writeIndex === undefined) delete process.env.WRITE_CATALOG_INDEX;
    else process.env.WRITE_CATALOG_INDEX = prev.writeIndex;
    throw err;
  }
}
