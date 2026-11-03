import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BottleLineArt } from '../components/art/BottleLineArt'
import { ProductGrid } from '../components/catalog/ProductGrid'
import {
  BagIcon,
  CheckIcon,
  FlowerIcon,
} from '../components/icons/Icons'
import { Breadcrumb } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { ProductImage } from '../components/ui/ProductImage'
import { QuantityStepper } from '../components/ui/QuantityStepper'
import { useCart } from '../hooks/useCart'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  getCategoryLabel,
  getProductBySlug,
  getRelatedProducts,
  slugify,
} from '../lib/catalog'
import { formatCurrency, formatVolume, getInstallmentAmount } from '../lib/format'


export function ProductPage() {
  const { slug = '' } = useParams()

  return <ProductPageContent key={slug} slug={slug} />
}

function ProductPageContent({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const product = getProductBySlug(slug)
  const { addItem } = useCart()

  usePageTitle(product ? product.name : 'Perfume não encontrado')

  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) {
      return
    }

    const timeout = window.setTimeout(() => setAdded(false), 3500)
    return () => window.clearTimeout(timeout)
  }, [added])

  if (!product) {
    return (
      <section className="section">
        <div className="container">
          <EmptyState
            icon={<BottleLineArt />}
            title="Perfume não encontrado"
            description="O produto que você procura pode ter saído do catálogo ou o endereço está incorreto."
            actions={
              <>
                <Link to="/perfumes" className="btn btn--primary">
                  Ver todos os perfumes
                </Link>
                <Link to="/" className="btn btn--outline">
                  Voltar ao início
                </Link>
              </>
            }
          />
        </div>
      </section>
    )
  }

  const soldOut = product.stock <= 0
  const relatedProducts = getRelatedProducts(product)

  const activeImageSource = product.images[activeImage] ?? product.images[0]

  function handleAdd(goToCart = false) {
    if (!product || soldOut) {
      return
    }

    addItem(product.id, quantity)

    if (goToCart) {
      navigate('/carrinho')
      return
    }

    setAdded(true)
  }

  return (
    <>
      <div className="container product-page">
        <Breadcrumb
          items={[
            { label: 'Início', to: '/' },
            { label: 'Perfumes', to: '/perfumes' },
            { label: product.name },
          ]}
        />

        <div className="product-layout">
          <div className="product-gallery">
            <div className="product-gallery__main">
              <ProductImage
                src={activeImageSource}
                alt={product.name}
                eager
                className="product-gallery__image"
              />
              <span className="product-gallery__badges">
                {product.isOffer ? <span className="badge badge--gold">Oferta</span> : null}
                {soldOut ? <span className="badge badge--muted">Esgotado</span> : null}
              </span>
            </div>

            {product.images.length > 1 ? (
              <div className="product-gallery__thumbs" aria-label="Imagens do produto">
                {product.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className="product-gallery__thumb"
                    aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                    aria-pressed={activeImage === index}
                    onClick={() => setActiveImage(index)}
                  >
                    <ProductImage src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}

            {product.images.length === 0 ? (
              <p className="product-gallery__note">
                As fotografias deste perfume serão adicionadas em breve.
              </p>
            ) : null}
          </div>

          <div className="product-info">
            <div className="product-info__topline">
              <p className="product-info__brand">
                <Link to={`/perfumes?marca=${slugify(product.brand)}`}>
                  {product.brand}
                </Link>
              </p>
            </div>

            <h1 className="product-info__title">{product.name}</h1>

            <p className="product-info__meta">
              <span>{formatVolume(product.volumeMl)}</span>
              <span>{product.concentration}</span>
              {product.category ? (
                <span>{getCategoryLabel(product.category)}</span>
              ) : null}
            </p>

            {product.description ? (
              <p className="product-info__description">{product.description}</p>
            ) : null}

            <div className="product-pricing">
              <div className="product-pricing__pix">
                <span className="product-pricing__eyebrow">À vista no Pix</span>
                <strong className="product-pricing__pix-value">
                  {formatCurrency(product.pixPrice)}
                </strong>
              </div>

              <div className="product-pricing__alternatives">
                <div className="product-pricing__option">
                  <span className="product-pricing__option-label">No débito</span>
                  <strong className="product-pricing__option-value">
                    {formatCurrency(product.debitPrice)}
                  </strong>
                </div>

                <div className="product-pricing__option">
                  <span className="product-pricing__option-label">
                    No cartão · 3x
                  </span>
                  <strong className="product-pricing__option-value">
                    {formatCurrency(getInstallmentAmount(product.installmentTotal))}
                  </strong>
                  <span className="product-pricing__option-note">
                    por parcela · total {formatCurrency(product.installmentTotal)}
                  </span>
                </div>
              </div>
            </div>

            <p
              className={`stock-status${
                soldOut ? ' stock-status--out' : ''
              }`}
            >
              <span className="stock-status__dot" aria-hidden="true" />
              {soldOut ? 'Esgotado' : 'Disponível em estoque'}
            </p>

            <div className="product-actions">
              <QuantityStepper
                value={quantity}
                min={1}
                max={Math.max(1, product.stock)}
                label={`Quantidade de ${product.name}`}
                onChange={setQuantity}
              />
              <button
                type="button"
                className="btn btn--primary product-actions__add"
                onClick={() => handleAdd(false)}
                disabled={soldOut}
              >
                <BagIcon width={18} height={18} />
                {soldOut ? 'Esgotado' : 'Adicionar à sacola'}
              </button>
            </div>

            <button
              type="button"
              className="btn btn--outline btn--block product-actions__buy"
              onClick={() => handleAdd(true)}
              disabled={soldOut}
            >
              {soldOut ? 'Indisponível' : 'Comprar agora'}
            </button>


            {added ? (
              <p className="product-added" role="status">
                <CheckIcon width={16} height={16} />
                Adicionado à sacola.
                <Link to="/carrinho">Ver sacola</Link>
              </p>
            ) : null}

            <div className="product-details">
              <h2 className="product-details__title">Informações do produto</h2>
              <dl className="product-details__list">
                <div>
                  <dt>Marca</dt>
                  <dd>{product.brand}</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{formatVolume(product.volumeMl)}</dd>
                </div>
                <div>
                  <dt>Concentração</dt>
                  <dd>{product.concentration}</dd>
                </div>
                {product.category ? (
                  <div>
                    <dt>Categoria</dt>
                    <dd>{getCategoryLabel(product.category)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Disponibilidade</dt>
                  <dd>{soldOut ? 'Esgotado' : 'Em estoque'}</dd>
                </div>

              </dl>
            </div>

            <p className="product-info__care">
              <FlowerIcon width={16} height={16} />
              Escolha com calma. Sua sacola fica salva neste navegador.
            </p>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="section section--related">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Continue explorando</p>
                <h2>Você também pode gostar</h2>
              </div>
              <Link to="/perfumes" className="section-heading__link">
                Ver todos
              </Link>
            </div>
            <ProductGrid products={relatedProducts} />
          </div>
        </section>
      ) : null}
    </>
  )
}
