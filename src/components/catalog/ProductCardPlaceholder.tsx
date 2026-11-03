import { BottleLineArt } from '../art/BottleLineArt'

export function ProductCardPlaceholder() {
  return (
    <article className="product-card product-card--placeholder" aria-hidden="true">
      <div className="product-card__media">
        <div className="image-placeholder">
          <BottleLineArt className="image-placeholder__art" />
          <span className="image-placeholder__label">Foto do perfume</span>
        </div>
      </div>

      <div className="product-card__body">
        <span className="placeholder-line placeholder-line--brand" />
        <span className="placeholder-line placeholder-line--name" />
        <span className="placeholder-line placeholder-line--meta" />
        <div className="placeholder-price">
          <span className="placeholder-price__value">R$ —</span>
          <span className="placeholder-price__label">Preço a definir</span>
        </div>
        <span className="placeholder-button">Em breve</span>
      </div>
    </article>
  )
}
