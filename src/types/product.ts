export type ProductCategory = 'feminino' | 'masculino' | 'unissex'

export interface Product {
  id: string
  slug: string
  name: string
  brand: string
  volumeMl: number
  concentration: string
  description?: string
  pixPrice: number
  debitPrice: number
  installmentTotal: number
  stock: number
  category: ProductCategory | null
  images: string[]
  isOffer?: boolean
  isFeatured?: boolean
  isNew?: boolean
  isBestSeller?: boolean
}
