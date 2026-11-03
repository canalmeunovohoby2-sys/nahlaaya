import type { Product, ProductCategory } from '../types/product'
import { supabase } from './supabase/client'

interface ProductRow {
  id: string
  slug: string
  name: string
  brand: string
  volume_ml: number
  concentration: string
  description: string | null
  pix_price_cents: number
  debit_price_cents: number
  installment_total_cents: number
  stock: number
  category: string | null
  images: string[] | null
}

function mapProduct(row: ProductRow): Product {
  const category =
    row.category === 'feminino' ||
    row.category === 'masculino' ||
    row.category === 'unissex'
      ? (row.category as ProductCategory)
      : null

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    volumeMl: row.volume_ml,
    concentration: row.concentration,
    description: row.description ?? '',
    pixPrice: row.pix_price_cents / 100,
    debitPrice: row.debit_price_cents / 100,
    installmentTotal: row.installment_total_cents / 100,
    stock: row.stock,
    category,
    images: Array.isArray(row.images) ? row.images : [],
  }
}

export async function fetchPublicProducts(): Promise<Product[]> {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data as ProductRow[]).map(mapProduct)
}
