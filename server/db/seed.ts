import { db } from './index'
import { products } from '../../src/data/products'

interface ProductRow {
  id: string
  slug: string
  name: string
  brand: string
  volumeMl: number
  concentration: string
  pixPriceCents: number
  debitPriceCents: number
  installmentTotalCents: number
  stock: number
  category: string | null
  images: string[]
}

const upsertProduct = db.prepare(`
  INSERT INTO products (
    id, slug, name, brand, volume_ml, concentration,
    pix_price_cents, debit_price_cents, installment_total_cents,
    stock, category, images_json, active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    name = excluded.name,
    brand = excluded.brand,
    volume_ml = excluded.volume_ml,
    concentration = excluded.concentration,
    pix_price_cents = excluded.pix_price_cents,
    debit_price_cents = excluded.debit_price_cents,
    installment_total_cents = excluded.installment_total_cents,
    category = excluded.category,
    images_json = excluded.images_json,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
`)

function toCents(value: number): number {
  return Math.round(value * 100)
}

function normalizeProduct(product: (typeof products)[number]): ProductRow {
  const installmentTotalCents = toCents(product.installmentTotal)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    volumeMl: product.volumeMl,
    concentration: product.concentration,
    pixPriceCents: Math.round(installmentTotalCents * 0.9),
    debitPriceCents: toCents(product.debitPrice),
    installmentTotalCents,
    stock: product.stock,
    category: product.category,
    images: product.images,
  }
}

export function seedProducts(): number {
  db.exec('BEGIN IMMEDIATE')

  try {
    for (const product of products) {
      const normalized = normalizeProduct(product)

      upsertProduct.run(
        normalized.id,
        normalized.slug,
        normalized.name,
        normalized.brand,
        normalized.volumeMl,
        normalized.concentration,
        normalized.pixPriceCents,
        normalized.debitPriceCents,
        normalized.installmentTotalCents,
        normalized.stock,
        normalized.category,
        JSON.stringify(normalized.images),
      )
    }

    db.exec('COMMIT')
    return products.length
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('server/db/seed.ts')) {
  const count = seedProducts()
  console.log(`Seed concluído: ${count} produtos.`)
}
