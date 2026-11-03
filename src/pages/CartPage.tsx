import { Link } from 'react-router-dom'
import { BottleLineArt } from '../components/art/BottleLineArt'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CartSummary } from '../components/cart/CartSummary'
import { BagIcon, TrashIcon } from '../components/icons/Icons'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useCart } from '../hooks/useCart'
import { usePageTitle } from '../hooks/usePageTitle'
import { getProductById } from '../lib/catalog'

export function CartPage() {
  usePageTitle('Sacola')
  const { lines, totalItems, removeItem } = useCart()
  const isEmpty = lines.length === 0

  return (
    <>
      <PageHeader
        eyebrow="Sua compra"
        title="Sua sacola"
        description="Revise os perfumes escolhidos, ajuste as quantidades e confira os valores."
        crumbs={[
          { label: 'Início', to: '/' },
          { label: 'Sacola' },
        ]}
        meta={
          isEmpty ? undefined : (
            <span className="page-hero__count">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          )
        }
      />

      <section className="cart-section">
        <div className="container">
          {isEmpty ? (
            <EmptyState
              icon={<BagIcon width={30} height={30} />}
              title="Sua sacola está vazia"
              description="Explore a coleção e adicione os perfumes que combinaram com você."
              actions={
                <>
                  <Link to="/perfumes" className="btn btn--primary">
                    Explorar perfumes
                  </Link>
                  <Link to="/ofertas" className="btn btn--outline">
                    Ver ofertas
                  </Link>
                </>
              }
            />
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {lines.map((line) => {
                  const product = getProductById(line.productId)

                  if (!product) {
                    return (
                      <article
                        key={line.productId}
                        className="cart-item cart-item--unavailable"
                      >
                        <div className="cart-item__media cart-item__media--unavailable">
                          <BottleLineArt />
                        </div>
                        <div className="cart-item__content">
                          <h2 className="cart-item__name">Produto indisponível</h2>
                          <p className="cart-item__meta">
                            Este item não está mais disponível no catálogo.
                          </p>
                          <button
                            type="button"
                            className="cart-item__remove"
                            onClick={() => removeItem(line.productId)}
                          >
                            <TrashIcon width={15} height={15} />
                            Remover
                          </button>
                        </div>
                      </article>
                    )
                  }

                  return (
                    <CartItemRow
                      key={line.productId}
                      line={line}
                      product={product}
                    />
                  )
                })}
              </div>

              <CartSummary />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
