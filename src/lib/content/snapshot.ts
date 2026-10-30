import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ColeccionEntry,
  PageEntry,
  ProductoEntry,
  ReferenceSummary,
  TaxonomyTerm,
  TiendaEntry,
} from '../emdash/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONTENT_CACHE_DIR = path.join(__dirname, '../../../.cache/content');
export const SNAPSHOT_PATH = path.join(CONTENT_CACHE_DIR, 'snapshot.json');

export interface ContentSnapshot {
  syncedAt: string;
  emdashUrl: string;
  productos: ProductoEntry[];
  colecciones: ColeccionEntry[];
  tiendas: TiendaEntry[];
  pages: PageEntry[];
  collectionProductRefs: Record<string, ReferenceSummary[]>;
  productStoreRefs: Record<string, ReferenceSummary[]>;
  categoriaTerms: TaxonomyTerm[];
  productCategoriaTerms: Record<string, TaxonomyTerm[]>;
}

export async function readSnapshot(): Promise<ContentSnapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf-8');
    return JSON.parse(raw) as ContentSnapshot;
  } catch {
    return null;
  }
}

export async function writeSnapshot(snapshot: ContentSnapshot): Promise<void> {
  await mkdir(CONTENT_CACHE_DIR, { recursive: true });
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
}
