import { products as fallbackProducts } from '../data/products'
import { categoryLabels } from '../data/categories'
import type { Product, ProductCategory } from '../types/product'

export const CATALOG_CHANGED_EVENT = 'nahla-aya:catalog-changed'

let catalogProducts: Product[] = fallbackProducts

export function setCatalogProducts(nextProducts: Product[]): void {
  catalogProducts = nextProducts
}

export function getCatalogProducts(): Product[] {
  return catalogProducts
}

export function notifyCatalogChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT))
  }
}

export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc'

export interface BrandSummary {
  name: string
  slug: string
  count: number
}

export interface ProductFilters {
  query?: string
  brand?: string
  sort?: SortOption
}

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'name-asc', label: 'Nome (A–Z)' },
]

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getProductById(id: string): Product | undefined {
  return catalogProducts.find((product) => product.id === id)
}

export function getProductBySlug(slug: string): Product | undefined {
  return catalogProducts.find((product) => product.slug === slug)
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return catalogProducts.filter((product) => product.category === category)
}

const HOME_SHELF_SIZE = 8

export function getOfferProducts(): Product[] {
  const flagged = catalogProducts.filter((product) => product.isOffer)
  return flagged.length > 0
    ? flagged
    : catalogProducts.slice(HOME_SHELF_SIZE, HOME_SHELF_SIZE * 2)
}

export function getNewProducts(): Product[] {
  const flagged = catalogProducts.filter((product) => product.isNew)
  return flagged.length > 0 ? flagged : catalogProducts.slice(0, HOME_SHELF_SIZE)
}

export function getBestSellerProducts(): Product[] {
  const flagged = catalogProducts.filter((product) => product.isBestSeller)
  return flagged.length > 0
    ? flagged
    : catalogProducts.slice(HOME_SHELF_SIZE * 2, HOME_SHELF_SIZE * 3)
}

export function getRelatedProducts(product: Product): Product[] {
  return catalogProducts
    .filter((item) => {
      const sharesCategory =
        product.category !== null && item.category === product.category

      return item.id !== product.id && (sharesCategory || item.brand === product.brand)
    })
    .slice(0, 4)
}

export function getBrandSummaries(list: Product[] = catalogProducts): BrandSummary[] {
  const brands = new Map<string, BrandSummary>()

  for (const product of list) {
    const slug = slugify(product.brand)
    const existing = brands.get(slug)

    if (existing) {
      existing.count += 1
    } else {
      brands.set(slug, { name: product.brand, slug, count: 1 })
    }
  }

  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function getBrandBySlug(slug: string): BrandSummary | undefined {
  return getBrandSummaries().find((brand) => brand.slug === slug)
}

export function getCategoryLabel(category: ProductCategory | null): string {
  return category ? categoryLabels[category] : 'A definir'
}

export function filterProducts(list: Product[], filters: ProductFilters): Product[] {
  const query = normalizeText(filters.query ?? '')
  const brand = filters.brand?.trim() ?? ''

  const filtered = list.filter((product) => {
    const matchesQuery =
      query.length === 0 ||
      normalizeText(product.name).includes(query) ||
      normalizeText(product.brand).includes(query) ||
      normalizeText(product.concentration).includes(query)

    const matchesBrand = brand.length === 0 || slugify(product.brand) === brand

    return matchesQuery && matchesBrand
  })

  switch (filters.sort) {
    case 'price-asc':
      return [...filtered].sort((a, b) => a.pixPrice - b.pixPrice)
    case 'price-desc':
      return [...filtered].sort((a, b) => b.pixPrice - a.pixPrice)
    case 'name-asc':
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return filtered
  }
}
