import { Link, useSearchParams } from 'react-router-dom'
import { BottleLineArt } from '../components/art/BottleLineArt'
import { CatalogToolbar } from '../components/catalog/CatalogToolbar'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { SearchIcon } from '../components/icons/Icons'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import type { Crumb } from '../components/ui/PageHeader'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  filterProducts,
  getBrandSummaries,
  getCatalogProducts,
  getOfferProducts,
  getProductsByCategory,
} from '../lib/catalog'
import type { SortOption } from '../lib/catalog'
import type { ProductCategory } from '../types/product'

interface CatalogPageProps {
  eyebrow: string
  title: string
  description: string
  crumbs: Crumb[]
  category?: ProductCategory
  offersOnly?: boolean
  emptyTitle: string
  emptyDescription: string
}

export function CatalogPage({
  eyebrow,
  title,
  description,
  crumbs,
  category,
  offersOnly = false,
  emptyTitle,
  emptyDescription,
}: CatalogPageProps) {
  usePageTitle(title)
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('busca') ?? ''
  const brand = searchParams.get('marca') ?? ''
  const rawSort = searchParams.get('ordenar')
  const sort: SortOption =
    rawSort === 'price-asc' ||
    rawSort === 'price-desc' ||
    rawSort === 'name-asc'
      ? rawSort
      : 'relevance'

  const baseProducts = offersOnly
    ? getOfferProducts()
    : category
      ? getProductsByCategory(category)
      : getCatalogProducts()

  const brands = getBrandSummaries(baseProducts)
  const filteredProducts = filterProducts(baseProducts, { query, brand, sort })
  const hasFilters = query.trim().length > 0 || brand.length > 0

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)

    if (value.length === 0 || (key === 'ordenar' && value === 'relevance')) {
      next.delete(key)
    } else {
      next.set(key, value)
    }

    setSearchParams(next)
  }

  function clearFilters() {
    setSearchParams({})
  }

  const collectionAction =
    category || offersOnly ? (
      <Link to="/perfumes" className="btn btn--outline">
        Ver todos os perfumes
      </Link>
    ) : (
      <Link to="/" className="btn btn--outline">
        Voltar ao início
      </Link>
    )

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        crumbs={crumbs}
        meta={
          baseProducts.length > 0 ? (
            <span className="page-hero__count">
              {baseProducts.length}{' '}
              {baseProducts.length === 1 ? 'perfume' : 'perfumes'}
            </span>
          ) : undefined
        }
      />

      <section className="catalog-section">
        <div className="container">
          {baseProducts.length > 0 ? (
            <CatalogToolbar
              total={filteredProducts.length}
              query={query}
              brand={brand}
              sort={sort}
              brands={brands}
              onBrandChange={(value) => updateParam('marca', value)}
              onSortChange={(value) => updateParam('ordenar', value)}
              onClearFilters={clearFilters}
            />
          ) : null}

          {baseProducts.length === 0 ? (
            <EmptyState
              icon={<BottleLineArt />}
              title={emptyTitle}
              description={emptyDescription}
              actions={collectionAction}
            />
          ) : filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <EmptyState
              icon={<SearchIcon width={28} height={28} />}
              title="Nenhum perfume encontrado"
              description={
                query.trim().length > 0
                  ? `Não encontramos resultados para “${query.trim()}”. Tente outro termo ou limpe os filtros.`
                  : 'Não encontramos perfumes com os filtros selecionados. Experimente outra combinação.'
              }
              actions={
                hasFilters ? (
                  <button type="button" className="btn btn--outline" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </section>
    </>
  )
}
