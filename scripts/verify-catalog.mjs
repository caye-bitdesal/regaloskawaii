process.env.EMDASH_USE_FIXTURES = process.env.EMDASH_USE_FIXTURES ?? '1';
const { buildCatalog } = await import('../src/lib/catalog/buildCatalog.ts');
const catalog = await buildCatalog();
console.log(
  `Catalog: ${catalog.products.length} products, ${catalog.collections.length} collections`,
);
if (catalog.products.length === 0) process.exit(1);
