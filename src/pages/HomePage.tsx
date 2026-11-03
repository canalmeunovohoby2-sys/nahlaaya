import { BenefitsBar } from '../components/home/BenefitsBar'
import { CategoryShowcase } from '../components/home/CategoryShowcase'
import { PromoCarousel } from '../components/home/PromoCarousel'
import { ProductShelf } from '../components/catalog/ProductShelf'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  getBestSellerProducts,
  getNewProducts,
  getOfferProducts,
} from '../lib/catalog'

export function HomePage() {
  usePageTitle()

  const launches = getNewProducts()
  const offers = getOfferProducts()
  const bestSellers = getBestSellerProducts()

  return (
    <>
      <h1 className="visually-hidden">Nahla Aya — Perfumaria</h1>

      <PromoCarousel />
      <BenefitsBar />

      <div className="home-shelves">
        <ProductShelf
          eyebrow="Novidades"
          title="Lançamentos"
          products={launches}
          viewAllTo="/perfumes"
          viewAllLabel="Ver todos"
        />

        <ProductShelf
          eyebrow="Ofertas"
          title="Promoções imperdíveis"
          products={offers}
          viewAllTo="/ofertas"
          viewAllLabel="Ver ofertas"
          variant="promo"
        />

        <ProductShelf
          eyebrow="Favoritos"
          title="Mais vendidos"
          products={bestSellers}
          viewAllTo="/perfumes"
          viewAllLabel="Ver todos"
        />
      </div>

      <CategoryShowcase />
    </>
  )
}
