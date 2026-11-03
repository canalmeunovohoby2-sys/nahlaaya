import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'

export function ProductGrid({
  products,
  className = '',
}: {
  products: Product[]
  className?: string
}) {
  return (
    <div className={`product-grid ${className}`.trim()}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
