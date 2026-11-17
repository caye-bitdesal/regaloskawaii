export type CategorySeo = {
  title: string;
  description: string;
};

/** Títulos ≤43 caracteres (SiteLayout añade « | Regalos Kawaii»). */
export const CATEGORY_SEO: Record<string, CategorySeo> = {
  squishy: {
    title: 'Squishies kawaii: mochis, animales y comida',
    description:
      'Squishies kawaii blanditos y antiestrés: de animales, de comida y gigantes. Los más vendidos, con precio actualizado y enlace directo a la tienda.',
  },
  'squishy-animales': {
    title: 'Squishy de animales: gatitos, patos y más',
    description:
      'Squishies de animales kawaii: gatitos, patos, pollitos, capibaras y más. Blanditos, antiestrés y perfectos para regalar desde pocos euros.',
  },
  'squishy-comida': {
    title: 'Squishy de comida: fresas, helados y bollos',
    description:
      'Squishies de comida kawaii: fresas, helados, bollos bao y dulces que se aplastan y vuelven a su forma. Ideas de regalo baratas y antiestrés.',
  },
  'squishy-gigantes': {
    title: 'Squishy gigante: grandes y muy blanditos',
    description:
      'Squishies gigantes y grandes: animales y comida kawaii de tamaño XXL para achuchar. Un regalo antiestrés que no pasa desapercibido.',
  },
  papeleria: {
    title: 'Papelería kawaii: libretas y pegatinas',
    description:
      'Papelería kawaii para clase o la oficina: libretas, bolígrafos, pegatinas, estuches y washi tape con animalitos y colores pastel.',
  },
  peluches: {
    title: 'Peluches kawaii: capibaras, gatos y más',
    description:
      'Peluches kawaii suaves y achuchables: capibaras, gatitos, ositos y criaturas adorables. Ideas de regalo para niñas, adolescentes y adultos.',
  },
  abrigos: {
    title: 'Abrigos kawaii: chaquetas y sudaderas',
    description:
      'Abrigos y prendas de abrigo kawaii para abrigarte con estilo: chaquetas, cazadoras y capas en colores pastel. Ideas de regalo para el frío.',
  },
  accesorios: {
    title: 'Accesorios kawaii: mochilas y llaveros',
    description:
      'Accesorios kawaii para el día a día: mochilas, bolsos, llaveros y detalles con animalitos. Regalos prácticos y monos para todas las edades.',
  },
  boligrafos: {
    title: 'Bolígrafos kawaii: gel y animalitos',
    description:
      'Bolígrafos kawaii de papelería: tinta gel, personajes y animalitos en colores pastel. Perfectos para clase, bullet journal o un detalle barato.',
  },
  botellas: {
    title: 'Botellas kawaii: termos y botellas',
    description:
      'Botellas y termos kawaii para hogar y cocina: diseños con animalitos, colores suaves y tamaños para llevar. Regalo útil y monísimo.',
  },
  'cajas-sorpresa': {
    title: 'Cajas sorpresa kawaii: mystery boxes',
    description:
      'Cajas sorpresa kawaii con figuritas, papelería y mini regalos dentro. Para quien ama las mystery boxes y descubrir cosas monas sin saber qué hay.',
  },
  camisetas: {
    title: 'Camisetas kawaii: anime y animalitos',
    description:
      'Camisetas kawaii de moda: estampados anime, animalitos y mensajes tiernos. Para regalar o combinar un look casual con toque kawaii.',
  },
  faldas: {
    title: 'Faldas kawaii: plisadas y pastel',
    description:
      'Faldas kawaii: plisadas, estampadas y en tonos pastel para un look dulce. Ideas de regalo de moda para adolescentes y adultos.',
  },
  'hogar-cocina': {
    title: 'Hogar kawaii: tazas, lámparas y más',
    description:
      'Hogar y cocina kawaii: tazas, lámparas, botellas y detalles que alegran la casa. Regalos bonitos para cocinita, despacho o habitación.',
  },
  lamparas: {
    title: 'Lámparas kawaii: LED y de noche',
    description:
      'Lámparas kawaii para hogar: luz de noche, LED con animalitos y diseños suaves. Iluminan y decoran; idea de regalo original y coqueta.',
  },
  libretas: {
    title: 'Libretas kawaii: agendas y cuadernos',
    description:
      'Libretas y agendas kawaii de papelería: portadas con animalitos, hojas bonitas y tamaños para notas o clase. Para escribir con estilo.',
  },
  libros: {
    title: 'Libros kawaii: colorear y manualidades',
    description:
      'Libros kawaii de papelería: para colorear, manualidades o lectura ligera con ilustraciones tiernas. Regalo tranquilo para creativos.',
  },
  llaveros: {
    title: 'Llaveros kawaii: charms y animalitos',
    description:
      'Llaveros kawaii de accesorios: charms, peluches mini y animalitos para las llaves o la mochila. Detalle barato que siempre gusta.',
  },
  mochilas: {
    title: 'Mochilas kawaii: bolsos y bandoleras',
    description:
      'Mochilas y bolsos kawaii de accesorios: bandoleras, mochilas escolares y bolsos con animalitos. Prácticos y achuchables a la vez.',
  },
  moda: {
    title: 'Moda kawaii: sudaderas y camisetas',
    description:
      'Moda kawaii: sudaderas, camisetas, faldas y pijamas con estilo tierno. Ropa cómoda y mona para regalar o renovar el armario.',
  },
  pegatinas: {
    title: 'Pegatinas kawaii: vinyl y decoración',
    description:
      'Pegatinas kawaii de papelería: vinyl, hojas troqueladas y diseños de animalitos para decorar libretas, móvil o regalo handmade.',
  },
  'pijamas-kigurumis': {
    title: 'Pijamas kawaii: kigurumis y pijamas',
    description:
      'Pijamas y kigurumis kawaii de moda: unicornios, animalitos y conjuntos cómodos. Regalo estrella para Navidad, cumpleaños o dormir con estilo.',
  },
  sudaderas: {
    title: 'Sudaderas kawaii: oversize y estampados',
    description:
      'Sudaderas kawaii de moda: oversize, capucha y estampados tiernos. Abrigo cómodo para adolescentes y adultos que aman el estilo kawaii.',
  },
  tazas: {
    title: 'Tazas kawaii: mugs y animalitos',
    description:
      'Tazas kawaii para hogar: mugs con orejas, animalitos y colores pastel. Para el café de la mañana o un regalo dulce y útil.',
  },
};

export function getCategorySeo(slug: string): CategorySeo | undefined {
  return CATEGORY_SEO[slug];
}