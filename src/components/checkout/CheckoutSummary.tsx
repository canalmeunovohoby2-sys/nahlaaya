import { Link } from 'react-router-dom'
import { formatCurrency, formatInstallment } from '../../lib/format'
import { getProductById } from '../../lib/catalog'
import { useCart } from '../../hooks/useCart'
import type {
  PaymentMethod,
  CheckoutSubmissionResult,
  ShippingQuoteOption,
} from '../../types/checkout'
import type { Product } from '../../types/product'

interface CheckoutSummaryProps {
  paymentMethod: PaymentMethod
  isSubmitting: boolean
  submission: CheckoutSubmissionResult | null
  submitError: string | null
  selectedShipping: ShippingQuoteOption | null
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
  selectedShipping,
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
  const shippingPrice = (selectedShipping?.priceCents ?? 0) / 100
  const total = subtotal + shippingPrice

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
                  <span className="checkout-item__monetary">
                    {formatCurrency(unit)}
                  </span>{' '}
                  cada
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
          {selectedShipping ? (
            <strong>{formatCurrency(selectedShipping.priceCents / 100)}</strong>
          ) : (
            <span className="checkout-summary__pending">A calcular</span>
          )}
        </div>
        {selectedShipping ? (
          <p className="checkout-summary__shipping-label">
            {selectedShipping.label} · {selectedShipping.estimatedDays}{' '}
            {selectedShipping.estimatedDays === 1 ? 'dia útil' : 'dias úteis'}
          </p>
        ) : null}
        <div className="checkout-summary__row checkout-summary__row--total">
          <span>Total do pedido</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <p className="checkout-summary__note">
          {selectedShipping
            ? 'Frete selecionado e incluído no total.'
            : 'Selecione uma opção de frete para incluir no total.'}
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
        disabled={isSubmitting || Boolean(submission) || !selectedShipping}
      >
        {isSubmitting
          ? 'Enviando pedido...'
          : submission
            ? 'Pedido registrado'
            : 'Finalizar pedido'}
      </button>
      <p className="checkout-summary__checkout-note">
        A confirmação definitiva do pagamento é feita pelo webhook do Mercado Pago.
      </p>

      {submission ? (
        <div className="checkout-summary__pending-panel" role="status">
          <strong>Pedido registrado</strong>
          <span>Número {submission.order.orderNumber}</span>
          <p>{submission.message}</p>
          <p>Continue na etapa de pagamento abaixo.</p>
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
