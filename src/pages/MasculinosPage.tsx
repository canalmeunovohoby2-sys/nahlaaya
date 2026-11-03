import { CatalogPage } from './CatalogPage'

export function MasculinosPage() {
  return (
    <CatalogPage
      eyebrow="Coleção"
      title="Masculinos"
      description="Perfumes masculinos para acompanhar a sua presença em cada ocasião."
      crumbs={[
        { label: 'Início', to: '/' },
        { label: 'Perfumes', to: '/perfumes' },
        { label: 'Masculinos' },
      ]}
      category="masculino"
      emptyTitle="Coleção em preparação"
      emptyDescription="Em breve, os perfumes masculinos da nossa curadoria estarão disponíveis aqui."
    />
  )
}
