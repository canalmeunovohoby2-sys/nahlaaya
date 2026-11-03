import { siteConfig } from '../../config/site'
import { formatCurrency, getInstallmentAmount } from '../../lib/format'
import type { Product } from '../../types/product'

export function PriceBlock({ product }: { product: Product }) {
  return (
    <div className="price">
      <p className="price__primary">
        <span className="price__value">{formatCurrency(product.pixPrice)}</span>
        <span className="price__label">no Pix</span>
      </p>

      <p className="price__installment">
        <span className="price__installment-label">no cartão</span>
        <span className="price__installment-copy">
          <strong>{siteConfig.installmentCount}x</strong> de{' '}
          <strong>
            {formatCurrency(getInstallmentAmount(product.installmentTotal))}
          </strong>
        </span>
      </p>
    </div>
  )
}
