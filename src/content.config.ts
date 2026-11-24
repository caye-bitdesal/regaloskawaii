import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const productoGuia = z.object({
  slug: z.string(),
  nota: z.string(),
});

const seccionGuia = z.object({
  titulo: z.string(),
  subtitulo: z.string().optional(),
  texto: z.string().optional(),
  productos: z.array(productoGuia),
});

const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guias' }),
  schema: z.object({
    title: z.string().max(43),
    description: z.string().max(155),
    h1: z.string(),
    publicado: z.coerce.date(),
    actualizado: z.coerce.date(),
    intro: z.string(),
    secciones: z.array(seccionGuia),
    colecciones: z.array(z.string()).optional(),
    relacionadas: z.array(z.string()).optional(),
  }),
});

export const collections = { guias };