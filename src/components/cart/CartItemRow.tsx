import { Link } from 'react-router-dom'
import { formatCurrency, formatInstallment, formatVolume } from '../../lib/format'
import { useCart } from '../../hooks/useCart'
import type { CartLine } from '../../lib/cart'
import type { Product } from '../../types/product'
import { TrashIcon } from '../icons/Icons'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'

interface CartItemRowProps {
  line: CartLine
  product: Product
}

export function CartItemRow({ line, product }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart()
  const lineTotal = product.pixPrice * line.quantity
  const maximumReached = line.quantity >= product.stock

  return (
    <article className="cart-item">
      <Link to={`/produto/${product.slug}`} className="cart-item__media">
        <ProductImage src={product.images[0]} alt={product.name} />
      </Link>

      <div className="cart-item__content">
        <div className="cart-item__heading">
          <div>
            <p className="cart-item__brand">{product.brand}</p>
            <h2 className="cart-item__name">
              <Link to={`/produto/${product.slug}`}>{product.name}</Link>
            </h2>
            <p className="cart-item__meta">
              {formatVolume(product.volumeMl)} · {product.concentration}
            </p>
          </div>
          <p className="cart-item__unit">
            {formatCurrency(product.pixPrice)}
            <span>no Pix</span>
            <span className="cart-item__installment">
              {formatInstallment(product.installmentTotal)}
            </span>
          </p>
        </div>

        <div className="cart-item__controls">
          <div className="cart-item__quantity">
            <QuantityStepper
              value={line.quantity}
              min={1}
              max={product.stock}
              label={`Quantidade de ${product.name}`}
              size="small"
              onChange={(quantity) => updateQuantity(product.id, quantity)}
            />
            <span className="cart-item__stock">
              {maximumReached ? 'Quantidade máxima disponível' : 'Disponível em estoque'}
            </span>
          </div>

          <div className="cart-item__end">
            <p className="cart-item__total">
              {formatCurrency(lineTotal)}
              <span>subtotal no Pix</span>
            </p>
            <button
              type="button"
              className="cart-item__remove"
              aria-label={`Remover ${product.name} da sacola`}
              onClick={() => removeItem(product.id)}
            >
              <TrashIcon width={15} height={15} />
              Remover
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
