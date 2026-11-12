import { formatCurrency } from '../../lib/format'
import type { ShippingQuoteOption } from '../../types/checkout'

interface CheckoutShippingProps {
  options: ShippingQuoteOption[]
  selectedId: string | null
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
}

export function CheckoutShipping({
  options,
  selectedId,
  loading,
  error,
  onSelect,
}: CheckoutShippingProps) {
  return (
    <section
      className="checkout-panel"
      id="checkout-shipping"
      tabIndex={-1}
      aria-labelledby="shipping-title"
    >
      <div className="checkout-panel__heading">
        <span className="checkout-panel__index">03</span>
        <div>
          <h2 id="shipping-title">Frete</h2>
          <p>
            Informe o CEP no endereço acima para consultar as opções de frete
            disponíveis.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="checkout-shipping__state" role="status" aria-live="polite">
          Calculando opções de frete...
        </div>
      ) : null}

      {!loading && error ? (
        <div
          className="checkout-shipping__state checkout-shipping__state--error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && options.length === 0 ? (
        <p className="checkout-shipping__hint">
          Digite um CEP válido para ver as opções de frete.
        </p>
      ) : null}

      {!loading && options.length > 0 ? (
        <div
          className="checkout-shipping-options"
          role="radiogroup"
          aria-label="Opções de frete"
        >
          {options.map((option) => {
            const selected = option.id === selectedId
            const inputId = `checkout-shipping-${option.id}`

            return (
              <label
                key={option.id}
                className={`checkout-shipping-option${
                  selected ? ' is-selected' : ''
                }`}
                htmlFor={inputId}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="shipping-service"
                  value={option.id}
                  checked={selected}
                  onChange={() => onSelect(option.id)}
                />
                <span className="checkout-shipping-option__name">
                  {option.label}
                  <span className="checkout-shipping-option__company">
                    {option.company}
                  </span>
                </span>
                <span className="checkout-shipping-option__meta">
                  {option.estimatedDays}{' '}
                  {option.estimatedDays === 1 ? 'dia útil' : 'dias úteis'}
                </span>
                <strong>{formatCurrency(option.priceCents)}</strong>
              </label>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
