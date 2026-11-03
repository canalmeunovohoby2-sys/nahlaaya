import { CatalogPage } from './CatalogPage'

export function FemininosPage() {
  return (
    <CatalogPage
      eyebrow="Coleção"
      title="Femininos"
      description="Perfumes femininos selecionados para acompanhar a sua assinatura em diferentes momentos."
      crumbs={[
        { label: 'Início', to: '/' },
        { label: 'Perfumes', to: '/perfumes' },
        { label: 'Femininos' },
      ]}
      category="feminino"
      emptyTitle="Coleção em preparação"
      emptyDescription="Em breve, os perfumes femininos da nossa curadoria estarão disponíveis aqui."
    />
  )
}
