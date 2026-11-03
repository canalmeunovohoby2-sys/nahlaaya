import { CatalogPage } from './CatalogPage'

export function OfertasPage() {
  return (
    <CatalogPage
      eyebrow="Condições especiais"
      title="Ofertas"
      description="Uma seleção de perfumes com condições especiais para você aproveitar."
      crumbs={[
        { label: 'Início', to: '/' },
        { label: 'Ofertas' },
      ]}
      offersOnly
      emptyTitle="Ofertas em preparação"
      emptyDescription="Ainda não há ofertas disponíveis. Volte em breve para conferir as condições especiais da coleção."
    />
  )
}
