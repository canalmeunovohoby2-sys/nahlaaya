import { useId } from 'react'
import type { BrandSummary, SortOption } from '../../lib/catalog'
import { sortOptions } from '../../lib/catalog'
import { CloseIcon } from '../icons/Icons'

interface CatalogToolbarProps {
  total: number
  query: string
  brand: string
  sort: SortOption
  brands: BrandSummary[]
  onBrandChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  onClearFilters: () => void
}

export function CatalogToolbar({
  total,
  query,
  brand,
  sort,
  brands,
  onBrandChange,
  onSortChange,
  onClearFilters,
}: CatalogToolbarProps) {
  const brandId = useId()
  const sortId = useId()
  const hasFilters = query.length > 0 || brand.length > 0

  return (
    <div className="catalog-toolbar">
      <p className="catalog-toolbar__count" aria-live="polite">
        <strong>{total}</strong> {total === 1 ? 'perfume encontrado' : 'perfumes encontrados'}
        {query ? <span> para “{query}”</span> : null}
      </p>

      <div className="catalog-toolbar__controls">
        {brands.length > 1 ? (
          <div className="field">
            <label htmlFor={brandId}>Marca</label>
            <select
              id={brandId}
              className="select"
              value={brand}
              onChange={(event) => onBrandChange(event.target.value)}
            >
              <option value="">Todas as marcas</option>
              {brand && !brands.some((item) => item.slug === brand) ? (
                <option value={brand}>Marca selecionada</option>
              ) : null}
              {brands.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor={sortId}>Ordenar por</label>
          <select
            id={sortId}
            className="select"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters ? (
          <button type="button" className="catalog-toolbar__clear" onClick={onClearFilters}>
            <CloseIcon width={14} height={14} />
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  )
}
