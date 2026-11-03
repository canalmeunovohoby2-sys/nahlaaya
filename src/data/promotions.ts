export type PromoArt = 'bottle' | 'flower' | 'leaf'

export interface PromoSlide {
  id: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaTo: string
  tone: 'green' | 'champagne' | 'cream'
  art: PromoArt
  image?: string
  imageAlt?: string
}

export const promoSlides: PromoSlide[] = [
  {
    id: 'banner-asad',
    eyebrow: 'Lattafa',
    title: 'ASAD',
    description: 'ASAD e ASAD Elixir.',
    ctaLabel: 'Conhecer ASAD',
    ctaTo: '/produto/asad',
    tone: 'green',
    art: 'bottle',
    image: '/images/bannerhero1.png',
    imageAlt: 'Embalagens ASAD e ASAD Elixir da Lattafa',
  },
  {
    id: 'colecao',
    eyebrow: 'Coleção Nahla Aya',
    title: 'Perfume para cada momento.',
    description:
      'Uma seleção pensada para acompanhar a sua rotina, os seus encontros e as ocasiões que merecem ser lembradas.',
    ctaLabel: 'Ver todos os perfumes',
    ctaTo: '/perfumes',
    tone: 'green',
    art: 'bottle',
  },
  {
    id: 'femininos',
    eyebrow: 'Femininos',
    title: 'A sua assinatura, do seu jeito.',
    description:
      'Opções para diferentes estilos e ocasiões, com a elegância de sempre.',
    ctaLabel: 'Ver femininos',
    ctaTo: '/femininos',
    tone: 'champagne',
    art: 'flower',
  },
  {
    id: 'masculinos',
    eyebrow: 'Masculinos',
    title: 'Presença em cada detalhe.',
    description:
      'Perfumes para acompanhar a sua rotina com personalidade e sofisticação.',
    ctaLabel: 'Ver masculinos',
    ctaTo: '/masculinos',
    tone: 'cream',
    art: 'leaf',
  },
]
