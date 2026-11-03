import { CatalogPage } from './CatalogPage'

export function PerfumesPage() {
  return (
    <CatalogPage
      eyebrow="Catálogo"
      title="Todos os perfumes"
      description="Explore a coleção completa da Nahla Aya e encontre o perfume que acompanha o seu momento."
      crumbs={[
        { label: 'Início', to: '/' },
        { label: 'Todos os perfumes' },
      ]}
      emptyTitle="Catálogo em preparação"
      emptyDescription="Nossa seleção de perfumes está sendo preparada. Em breve, novas fragrâncias estarão disponíveis aqui."
    />
  )
}
