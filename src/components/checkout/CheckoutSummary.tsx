import { Link } from 'react-router-dom'
import { formatCurrency, formatInstallment } from '../../lib/format'
import { getProductById } from '../../lib/catalog'
import { useCart } from '../../hooks/useCart'
import type { PaymentMethod, CheckoutSubmissionResult } from '../../types/checkout'
import type { Product } from '../../types/product'

interface CheckoutSummaryProps {
  paymentMethod: PaymentMethod
  isSubmitting: boolean
  submission: CheckoutSubmissionResult | null
  submitError: string | null
}

const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito em 3x',
}

function unitPrice(product: Product, paymentMethod: PaymentMethod): number {
  if (paymentMethod === 'debit') {
    return product.debitPrice
  }

  if (paymentMethod === 'credit') {
    return product.installmentTotal
  }

  return product.pixPrice
}

export function CheckoutSummary({
  paymentMethod,
  isSubmitting,
  submission,
  submitError,
}: CheckoutSummaryProps) {
  const {
    lines,
    totalItems,
    subtotalPix,
    subtotalDebit,
    installmentTotal,
  } = useCart()

  const subtotal =
    paymentMethod === 'debit'
      ? subtotalDebit
      : paymentMethod === 'credit'
        ? installmentTotal
        : subtotalPix

  const items = lines
    .map((line) => ({ line, product: getProductById(line.productId) }))
    .filter(
      (item): item is { line: (typeof lines)[number]; product: Product } =>
        Boolean(item.product),
    )

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title" className="checkout-summary__title">
        Resumo do pedido
      </h2>
      <p className="checkout-summary__count">
        {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
      </p>

      <div className="checkout-summary__items">
        {items.map(({ line, product }) => {
          const unit = unitPrice(product, paymentMethod)
          const lineTotal = unit * line.quantity

          return (
            <div key={line.productId} className="checkout-item">
              <div className="checkout-item__image">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="checkout-item__info">
                <p className="checkout-item__brand">{product.brand}</p>
                <p className="checkout-item__name">{product.name}</p>
                <p className="checkout-item__qty">
                  {line.quantity} {line.quantity === 1 ? 'unidade' : 'unidades'}
                  {' · '}
                  {formatCurrency(unit)} cada
                </p>
              </div>
              <p className="checkout-item__total">{formatCurrency(lineTotal)}</p>
            </div>
          )
        })}
      </div>

      <div className="checkout-summary__totals">
        <div className="checkout-summary__row">
          <span>Subtotal ({paymentLabels[paymentMethod]})</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <div className="checkout-summary__row">
          <span>Frete</span>
          <span className="checkout-summary__pending">A calcular</span>
        </div>
        <div className="checkout-summary__row checkout-summary__row--total">
          <span>Total do pedido</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <p className="checkout-summary__note">
          Frete não incluído. O cálculo será habilitado com a integração do Melhor
          Envio.
        </p>
        {paymentMethod === 'credit' ? (
          <p className="checkout-summary__installment">
            Crédito em 3x: <strong>{formatInstallment(installmentTotal)}</strong>
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--block checkout-summary__submit"
        disabled={isSubmitting || Boolean(submission)}
      >
        {isSubmitting
          ? 'Enviando pedido...'
          : submission
            ? 'Pedido registrado'
            : 'Finalizar pedido'}
      </button>
      <p className="checkout-summary__checkout-note">
        Pagamento e frete serão confirmados na próxima etapa.
      </p>

      {submission ? (
        <div className="checkout-summary__pending-panel" role="status">
          <strong>Pedido registrado</strong>
          <span>Número {submission.order.orderNumber}</span>
          <p>{submission.message}</p>
          <p>O pagamento está pendente. Nenhuma cobrança foi realizada.</p>
        </div>
      ) : null}

      {submitError ? (
        <div className="checkout-summary__error-panel" role="alert">
          <strong>Não foi possível finalizar</strong>
          <p>{submitError}</p>
        </div>
      ) : null}

      <Link to="/carrinho" className="checkout-summary__back">
        Voltar à sacola
      </Link>
    </aside>
  )
}
