import { Link } from 'react-router-dom'
import { formatCurrency, formatInstallment } from '../../lib/format'
import { useCart } from '../../hooks/useCart'

export function CartSummary() {
  const {
    totalItems,
    subtotalPix,
    subtotalDebit,
    installmentTotal,
    hasUnavailableItems,
    clearCart,
  } = useCart()

  return (
    <aside className="cart-summary" aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title" className="cart-summary__title">
        Resumo da sacola
      </h2>
      <p className="cart-summary__count">
        {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
      </p>

      <div className="cart-summary__pix">
        <span className="cart-summary__pix-label">Total no Pix</span>
        <strong className="cart-summary__pix-value">
          {formatCurrency(subtotalPix)}
        </strong>
      </div>

      <div className="cart-summary__rows">
        <div className="summary-row">
          <span>Total no débito</span>
          <strong>{formatCurrency(subtotalDebit)}</strong>
        </div>
        <div className="summary-row">
          <span>Total no crédito em 3x</span>
          <strong>{formatCurrency(installmentTotal)}</strong>
        </div>
        <div className="summary-row summary-row--installment">
          <span>Valor de cada parcela</span>
          <strong>{formatInstallment(installmentTotal)}</strong>
        </div>
      </div>

      {hasUnavailableItems ? (
        <p className="cart-summary__warning" role="status">
          Um ou mais itens não estão mais disponíveis no catálogo. Revise a sacola
          antes de continuar.
        </p>
      ) : null}

      <p className="cart-summary__note">
        Frete e pagamento serão confirmados na próxima etapa.
      </p>

      <Link to="/checkout" className="btn btn--primary btn--block">
        Avançar para o checkout
      </Link>

      <Link to="/perfumes" className="btn btn--outline btn--block">
        Continuar comprando
      </Link>

      <button type="button" className="cart-summary__clear" onClick={clearCart}>
        Esvaziar sacola
      </button>
    </aside>
  )
}
