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
    imageAlt: 'Mais que um aroma: a sua identidade olfativa',
  },
  {
    id: 'banner-arabes',
    ctaLabel: 'Ver perfumes',
    ctaTo: '/perfumes',
    image: '/images/bannerhero2.png',
    mobileImage: '/images/bannerheromobile3.png',
    imageAlt: 'Perfumes árabes: sofisticação em cada fragrância',
  },
]
