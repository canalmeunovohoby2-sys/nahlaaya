import { BrandCard } from '../components/catalog/BrandCard'
import { BottleLineArt } from '../components/art/BottleLineArt'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { usePageTitle } from '../hooks/usePageTitle'
import { getBrandSummaries } from '../lib/catalog'
import { Link } from 'react-router-dom'

export function MarcasPage() {
  usePageTitle('Marcas')
  const brands = getBrandSummaries()

  return (
    <>
      <PageHeader
        eyebrow="Curadoria"
        title="Marcas"
        description="Conheça as marcas que fazem parte da seleção Nahla Aya e explore os perfumes de cada uma."
        crumbs={[
          { label: 'Início', to: '/' },
          { label: 'Marcas' },
        ]}
        meta={
          brands.length > 0 ? (
            <span className="page-hero__count">
              {brands.length} {brands.length === 1 ? 'marca' : 'marcas'}
            </span>
          ) : undefined
        }
      />

      <section className="catalog-section">
        <div className="container">
          {brands.length > 0 ? (
            <div className="brand-grid">
              {brands.map((brand) => (
                <BrandCard key={brand.slug} brand={brand} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BottleLineArt />}
              title="Marcas em breve"
              description="As marcas da nossa curadoria serão apresentadas aqui assim que o catálogo estiver completo."
              actions={
                <Link to="/perfumes" className="btn btn--outline">
                  Ver todos os perfumes
                </Link>
              }
            />
          )}
        </div>
      </section>
    </>
  )
}
