import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons/Icons'
import { ProductCard } from './ProductCard'
import { ProductCardPlaceholder } from './ProductCardPlaceholder'

interface ProductShelfProps {
  title: string
  eyebrow?: string
  products: Product[]
  viewAllTo: string
  viewAllLabel?: string
  variant?: 'default' | 'promo'
  emptyNote?: string
}

export function ProductShelf({
  title,
  eyebrow,
  products,
  viewAllTo,
  viewAllLabel = 'Ver todos',
  variant = 'default',
  emptyNote = 'Vitrine em preparação. Os produtos serão exibidos aqui após o cadastro.',
}: ProductShelfProps) {
  const titleId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ left: false, right: false })
  const hasProducts = products.length > 0

  useEffect(() => {
    const track = trackRef.current

    if (!track) {
      return
    }

    function update() {
      if (!track) {
        return
      }

      setScrollState({
        left: track.scrollLeft > 4,
        right: track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
      })
    }

    const frame = window.requestAnimationFrame(update)
    const observer = new ResizeObserver(update)

    track.addEventListener('scroll', update, { passive: true })
    observer.observe(track)

    return () => {
      window.cancelAnimationFrame(frame)
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [products.length])

  function scroll(direction: -1 | 1) {
    const track = trackRef.current

    if (!track) {
      return
    }

    track.scrollBy({
      left: track.clientWidth * 0.82 * direction,
      behavior: 'smooth',
    })
  }

  const hasOverflow = scrollState.left || scrollState.right

  return (
    <section
      className={`product-shelf${
        variant === 'promo' ? ' product-shelf--promo' : ''
      }`}
      aria-labelledby={titleId}
    >
      <div className="container">
        <div className="shelf-header">
          <div className="shelf-header__title">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>

          <div className="shelf-header__actions">
            {hasProducts && hasOverflow ? (
              <div className="shelf-arrows">
                <button
                  type="button"
                  className="shelf-arrow"
                  aria-label={`Rolar ${title} para a esquerda`}
                  disabled={!scrollState.left}
                  onClick={() => scroll(-1)}
                >
                  <ArrowLeftIcon width={17} height={17} />
                </button>
                <button
                  type="button"
                  className="shelf-arrow"
                  aria-label={`Rolar ${title} para a direita`}
                  disabled={!scrollState.right}
                  onClick={() => scroll(1)}
                >
                  <ArrowRightIcon width={17} height={17} />
                </button>
              </div>
            ) : null}

            <Link to={viewAllTo} className="shelf-link">
              {viewAllLabel}
              <ArrowRightIcon width={15} height={15} />
            </Link>
          </div>
        </div>

        {hasProducts ? (
          <div className="product-shelf__viewport">
            <div
              ref={trackRef}
              className="product-shelf__track"
              tabIndex={0}
              aria-label={`${title}: rolagem horizontal`}
            >
              {products.map((product) => (
                <div key={product.id} className="product-shelf__item">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="visually-hidden">{emptyNote}</p>
            <div className="product-shelf__viewport">
              <div className="product-shelf__track product-shelf__track--placeholder">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="product-shelf__item">
                    <ProductCardPlaceholder />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
