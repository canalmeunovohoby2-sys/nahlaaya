import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVolume } from '../../lib/format'
import { slugify } from '../../lib/catalog'
import { useCart } from '../../hooks/useCart'
import type { Product } from '../../types/product'
import { BagIcon, CheckIcon } from '../icons/Icons'
import { PriceBlock } from '../ui/PriceBlock'
import { ProductImage } from '../ui/ProductImage'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const soldOut = product.stock <= 0

  useEffect(() => {
    if (!added) {
      return
    }

    const timeout = window.setTimeout(() => setAdded(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [added])

  function handleAdd() {
    addItem(product.id)
    setAdded(true)
  }

  return (
    <article className="product-card">
      <Link
        to={`/produto/${product.slug}`}
        className="product-card__media"
        aria-label={`Ver ${product.name}`}
      >
        <ProductImage src={product.images[0]} alt={product.name} className="product-card__image" />
        <span className="product-card__badges">
          {product.isNew ? <span className="badge">Novo</span> : null}
          {product.isOffer ? <span className="badge badge--gold">Oferta</span> : null}
          {soldOut ? <span className="badge badge--muted">Esgotado</span> : null}
        </span>
      </Link>

      <div className="product-card__body">
        <p className="product-card__brand">
          <Link to={`/perfumes?marca=${slugify(product.brand)}`}>{product.brand}</Link>
        </p>
        <h3 className="product-card__name">
          <Link to={`/produto/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-card__meta">
          {formatVolume(product.volumeMl)} · {product.concentration}
        </p>

        <PriceBlock product={product} />

        <button
          type="button"
          className={`btn btn--outline btn--block product-card__action${
            added ? ' is-added' : ''
          }`}
          onClick={handleAdd}
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.name} está esgotado`
              : `Adicionar ${product.name} à sacola`
          }
        >
          {added ? <CheckIcon width={17} height={17} /> : <BagIcon width={17} height={17} />}
          {soldOut ? 'Esgotado' : added ? 'Adicionado' : 'Adicionar'}
        </button>
      </div>
    </article>
  )
}
