export type EmDashBool = 0 | 1;

export interface EmDashImage {
  id: string;
  provider: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  alt?: string;
  blurhash?: string;
  dominantColor?: string;
  meta: {
    storageKey: string;
    caption: string | null;
    blurhash?: string;
    dominantColor?: string;
  };
}

export interface PortableTextBlock {
  _type: string;
  _key: string;
  style?: string;
  children?: { _type: string; _key: string; text: string; marks?: string[] }[];
}

export interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  label: string;
  parentId: string | null;
  children?: TaxonomyTerm[];
  count?: number;
  locale: string;
  translationGroup: string;
}

export interface ProductoData {
  title: string;
  resumen?: string;
  descripcion?: PortableTextBlock[];
  id_externo: string;
  enlace_afiliado?: string;
  precio_ref?: number;
  precio_actualizado?: string;
  imagen?: EmDashImage;
  galeria?: { imagen: EmDashImage }[];
  fuente_imagen?: string;
  tipo?: string;
  edad_min?: number;
  destacado: EmDashBool;
  para_grabar?: EmDashBool;
  notas?: string;
}

export interface ProductoEntry {
  id: string;
  type: 'productos';
  slug: string;
  status: string;
  data: ProductoData;
  seo?: {
    title: string | null;
    description: string | null;
    image: string | null;
    canonical: string | null;
    noIndex: boolean;
  };
}

export interface ColeccionData {
  title: string;
  descripcion?: string;
  imagen?: EmDashImage;
  orden: number;
  destacada: EmDashBool;
}

export interface ColeccionEntry {
  id: string;
  type: 'colecciones';
  slug: string;
  status: string;
  data: ColeccionData;
  seo?: ProductoEntry['seo'];
}

export interface TiendaData {
  title: string;
  plantilla_url: string;
  tag_web: string;
  tag_telegram?: string;
  tag_tiktok?: string;
  activa: EmDashBool;
}

export interface TiendaEntry {
  id: string;
  type: 'tiendas';
  slug: string | null;
  status: string;
  data: TiendaData;
}

export interface PageData {
  title: string;
  content: PortableTextBlock[];
}

export interface PageEntry {
  id: string;
  type: 'pages';
  slug: string;
  status: string;
  data: PageData;
  seo?: ProductoEntry['seo'];
}

export interface ReferenceSummary {
  id: string;
  slug: string | null;
  collection: string;
  title: string;
  locale: string;
  sortOrder: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  resumen: string;
  descripcion?: PortableTextBlock[];
  precioRef?: number;
  imagenUrl?: string;
  imagenAlt?: string;
  destacado: boolean;
  categoriaSlugs: string[];
  categoriaLabels: string[];
  coleccionSlugs: string[];
  coleccionTitles: string[];
  tiendaId: string;
  tiendaTitle: string;
  affiliateUrl: string;
  seo: ProductoEntry['seo'];
}

export interface CatalogCategory {
  id: string;
  slug: string;
  label: string;
  count: number;
  productIds: string[];
}

export interface CatalogCollection {
  id: string;
  slug: string;
  title: string;
  descripcion: string;
  orden: number;
  destacada: boolean;
  productIds: string[];
}

export interface CatalogPage {
  slug: string;
  title: string;
  content: PortableTextBlock[];
  seo?: PageEntry['seo'];
}

export interface Catalog {
  products: CatalogProduct[];
  productsBySlug: Record<string, CatalogProduct>;
  categories: CatalogCategory[];
  categoriesBySlug: Record<string, CatalogCategory>;
  collections: CatalogCollection[];
  collectionsBySlug: Record<string, CatalogCollection>;
  pages: CatalogPage[];
  pagesBySlug: Record<string, CatalogPage>;
  tiendas: TiendaEntry[];
  emdashUrl: string;
}

export interface CatalogSearchEntry {
  slug: string;
  title: string;
  resumen: string;
  coleccionSlugs: string[];
  precioRef?: number;
}
