import { existsSync } from 'node:fs';
import { rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { PUBLIC_MEDIA_DIR } from './syncMedia';

/** Anchos generados en la build (WebP), sin ampliar por encima del original. */
export const IMAGE_VARIANT_WIDTHS = [320, 480, 800, 1200] as const;

const VARIANTABLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SKIP = new Set(['.gif']);

export function variantBasename(originalBasename: string, width: number): string {
  const stem = originalBasename.replace(/\.[^.]+$/i, '');
  return `${stem}-${width}w.webp`;
}

export function isGeneratedVariantFilename(name: string): boolean {
  return /-\d+w\.webp$/i.test(name);
}

/** ¿Mantener este fichero de media dado el conjunto de basenames originales del catálogo? */
export function shouldKeepMediaFile(name: string, wantedOriginals: Set<string>): boolean {
  if (wantedOriginals.has(name)) return true;
  if (!isGeneratedVariantFilename(name)) return false;
  const stem = name.replace(/-\d+w\.webp$/i, '');
  for (const original of wantedOriginals) {
    if (original.replace(/\.[^.]+$/i, '') === stem) return true;
  }
  return false;
}

function extOf(filename: string): string {
  return path.extname(filename).toLowerCase();
}

async function writeVariant(
  inputPath: string,
  destPath: string,
  width: number,
): Promise<void> {
  const part = `${destPath}.part`;
  const buffer = await sharp(inputPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  await writeFile(part, buffer);
  await rename(part, destPath);
}

/**
 * Genera WebP responsive en `public/media` a partir de ficheros ya descargados.
 * Omite GIF y variantes que ya existen y son recientes respecto al original.
 */
export async function ensureImageVariants(storageKeys: string[]): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const key of storageKeys) {
    const basename = path.basename(key);
    if (seen.has(basename)) continue;
    seen.add(basename);

    const ext = extOf(basename);
    if (SKIP.has(ext)) {
      skipped++;
      continue;
    }
    if (!VARIANTABLE.has(ext)) {
      skipped++;
      continue;
    }

    const inputPath = path.join(PUBLIC_MEDIA_DIR, basename);
    const inputStat = await stat(inputPath).catch(() => undefined);
    if (!inputStat?.size) {
      skipped++;
      continue;
    }

    let meta: Metadata;
    try {
      meta = await sharp(inputPath).metadata();
    } catch {
      skipped++;
      continue;
    }

    const sourceWidth = meta.width ?? 0;
    if (sourceWidth < 1) {
      skipped++;
      continue;
    }

    const widths = IMAGE_VARIANT_WIDTHS.filter((w) => w <= sourceWidth);
    const largest = widths.length > 0 ? widths[widths.length - 1]! : sourceWidth;
    const targets =
      widths.length > 0 ? widths : ([Math.min(sourceWidth, 800)] as const);

    for (const width of targets) {
      const variantName = variantBasename(basename, width);
      const destPath = path.join(PUBLIC_MEDIA_DIR, variantName);
      const destStat = await stat(destPath).catch(() => undefined);
      if (destStat && destStat.mtimeMs >= inputStat.mtimeMs) {
        skipped++;
        continue;
      }
      await writeVariant(inputPath, destPath, width);
      created++;
    }

    // Si el original es JPG/PNG grande, las tarjetas usan variantes; el original sigue para OG.
    void largest;
  }

  return { created, skipped };
}

export type ImageVariant = { width: number; url: string };

export function listVariantsForBasename(basename: string): ImageVariant[] {
  const out: ImageVariant[] = [];
  for (const width of IMAGE_VARIANT_WIDTHS) {
    const variantName = variantBasename(basename, width);
    if (existsSync(path.join(PUBLIC_MEDIA_DIR, variantName))) {
      out.push({ width, url: `/media/${variantName}` });
    }
  }
  return out;
}

export function pickDefaultSrc(variants: ImageVariant[], fallbackUrl: string): string {
  if (variants.length === 0) return fallbackUrl;
  const preferred = variants.find((v) => v.width === 480) ?? variants[variants.length - 1];
  return preferred?.url ?? fallbackUrl;
}

export function buildSrcSet(variants: ImageVariant[]): string | undefined {
  if (variants.length === 0) return undefined;
  return variants.map((v) => `${v.url} ${v.width}w`).join(', ');
}

/** Tamaños de la rejilla de tarjetas: 2 col. &lt;560px, 2 col. &lt;900px, 4 col. escritorio. */
export const PRODUCT_GRID_SIZES =
  '(max-width: 560px) calc(50vw - 24px), (max-width: 900px) calc(50vw - 28px), 25vw';

export const PRODUCT_DETAIL_SIZES = '(max-width: 900px) 100vw, min(560px, 46vw)';

export const HERO_IMAGE_SIZES = '(max-width: 900px) 100vw, 520px';
