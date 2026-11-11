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
