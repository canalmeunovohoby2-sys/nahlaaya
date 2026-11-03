export interface PromoSlide {
  id: string
  ctaLabel: string
  ctaTo: string
  image: string
  mobileImage?: string
  imageAlt?: string
}

export const promoSlides: PromoSlide[] = [
  {
    id: 'banner-asad',
    ctaLabel: 'Ver perfumes',
    ctaTo: '/perfumes',
    image: '/images/bannerhero1.png',
    mobileImage: '/images/bannerheromovbile1.png',
    imageAlt: 'Perfumes árabes Fada, Ameerati e Sabah Al Ward',
  },
  {
    id: 'banner-luxo',
    ctaLabel: 'Ver perfumes',
    ctaTo: '/perfumes',
    image: '/images/bannerhero2.png',
    mobileImage: '/images/bannerheromobile2.png',
    imageAlt: 'O luxo do perfume que combina com seu estilo',
  },
  {
    id: 'banner-destaque',
    ctaLabel: 'Ver perfumes',
    ctaTo: '/perfumes',
    image: '/images/bannerhero3.png',
    mobileImage: '/images/bannerheromobile3.png',
    imageAlt: 'Perfumes em destaque na Nahla Aya',
  },
]
