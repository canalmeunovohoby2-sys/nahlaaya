import { formatCurrency } from '../../lib/format'
import type { ShippingQuoteOption } from '../../types/checkout'

interface CheckoutShippingProps {
  cep: string
  cepError: string | null
  options: ShippingQuoteOption[]
  selectedId: string | null
  loading: boolean
  error: string | null
  onCepChange: (value: string) => void
  onCalculate: () => void
  onSelect: (id: string) => void
}

export function CheckoutShipping({
  cep,
  cepError,
  options,
  selectedId,
  loading,
  error,
  onCepChange,
  onCalculate,
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
          <p>Consulte as opções de entrega para o CEP de destino.</p>
        </div>
      </div>

      <div className="checkout-shipping__lookup">
        <div
          className={`checkout-field checkout-shipping__cep${
            cepError ? ' checkout-field--error' : ''
          }`}
        >
          <label htmlFor="checkout-shipping-cep">
            CEP de destino<span aria-hidden="true"> *</span>
          </label>
          <input
            id="checkout-shipping-cep"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            value={cep}
            onChange={(event) => onCepChange(event.target.value)}
            placeholder="00000-000"
            aria-invalid={Boolean(cepError)}
            aria-describedby={
              cepError ? 'checkout-shipping-cep-error' : undefined
            }
          />
          {cepError ? (
            <p className="checkout-field__error" id="checkout-shipping-cep-error">
              {cepError}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="btn btn--gold checkout-shipping__calculate"
          onClick={onCalculate}
          disabled={loading}
        >
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
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
                <strong>{formatCurrency(option.priceCents / 100)}</strong>
              </label>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
