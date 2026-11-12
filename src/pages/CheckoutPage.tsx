import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckoutField } from '../components/checkout/CheckoutField'
import { CheckoutShipping } from '../components/checkout/CheckoutShipping'
import { CheckoutSummary } from '../components/checkout/CheckoutSummary'
import { PageHeader } from '../components/ui/PageHeader'
import { useCart } from '../hooks/useCart'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  brazilianStates,
  buildCheckoutPayload,
  emptyCheckoutForm,
  formatCep,
  formatCpf,
  formatPhone,
  onlyDigits,
  validateCheckoutForm,
} from '../lib/checkout'
import {
  clearSavedCheckout,
  hasCheckoutData,
  readSavedCheckout,
  writeSavedCheckout,
} from '../lib/checkout-storage'
import type {
  CheckoutErrors,
  CheckoutFormField,
  CheckoutFormValues,
} from '../lib/checkout'
import { submitCheckout } from '../services/checkout'
import { requestShippingQuote } from '../services/shipping'
import { formatCurrency, formatInstallment } from '../lib/format'
import type {
  CheckoutSubmissionResult,
  PaymentMethod,
  ShippingQuoteOption,
} from '../types/checkout'

export function CheckoutPage() {
  usePageTitle('Checkout')

  const {
    lines,
    totalItems,
    subtotalPix,
    subtotalDebit,
    installmentTotal,
    hasUnavailableItems,
  } = useCart()

  const [form, setForm] = useState<CheckoutFormValues>(() =>
    readSavedCheckout() ?? emptyCheckoutForm,
  )
  const hasSavedData = hasCheckoutData(form)
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submission, setSubmission] =
    useState<CheckoutSubmissionResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingQuoteOption[]>([])
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [shippingQuoteTrigger, setShippingQuoteTrigger] = useState(0)
  const shippingItemsKey = lines
    .map((line) => `${line.productId}:${line.quantity}`)
    .sort()
    .join('|')

  useEffect(() => {
    writeSavedCheckout(form)
  }, [form])

  useEffect(() => {
    const cep = onlyDigits(form.cep)
    let active = true
    let clearTimer: number | undefined
    let requestTimer: number | undefined

    if (cep.length === 8) {
      clearTimer = window.setTimeout(() => {
        if (!active) {
          return
        }

        setShippingOptions([])
        setSelectedShippingId(null)
        setShippingLoading(true)
        setShippingError(null)
      }, 0)

      requestTimer = window.setTimeout(() => {
        void requestShippingQuote({
          cep,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        })
          .then((result) => {
            if (!active) {
              return
            }

            if (result.status !== 'quote') {
              setShippingError(result.message)
              return
            }

            setShippingOptions(result.options)
            setSelectedShippingId((current) =>
              result.options.some((option) => option.id === current)
                ? current
                : (result.options[0]?.id ?? null),
            )
          })
          .catch((error: unknown) => {
            if (!active) {
              return
            }

            setShippingError(
              error instanceof Error
                ? error.message
                : 'Não foi possível calcular o frete.',
            )
          })
          .finally(() => {
            if (active) {
              setShippingLoading(false)
            }
          })
      }, 450)
    }

    return () => {
      active = false
      if (clearTimer) window.clearTimeout(clearTimer)
      if (requestTimer) window.clearTimeout(requestTimer)
    }
  }, [form.cep, shippingItemsKey, lines, shippingQuoteTrigger])

  if (lines.length === 0 || hasUnavailableItems) {
    return <Navigate to="/carrinho" replace />
  }

  function resetShippingQuote() {
    setShippingOptions([])
    setSelectedShippingId(null)
    setShippingLoading(false)
    setShippingError(null)
  }

  function handleFieldChange(field: CheckoutFormField, value: string) {
    let nextValue = value

    if (field === 'cpf') {
      nextValue = formatCpf(value)
    } else if (field === 'cep') {
      nextValue = formatCep(value)
      resetShippingQuote()
    } else if (field === 'phone') {
      nextValue = formatPhone(value)
    } else if (field === 'state') {
      nextValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    }

    setForm((current) => ({ ...current, [field]: nextValue }))
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    setSubmission(null)
    setSubmitError(null)
  }

  function handleClearSavedData() {
    if (
      !window.confirm(
        'Limpar os dados salvos deste navegador? Os campos serão esvaziados.',
      )
    ) {
      return
    }

    clearSavedCheckout()
    setForm(emptyCheckoutForm)
    setErrors({})
    setSubmission(null)
    setSubmitError(null)
    resetShippingQuote()
  }

  function handlePaymentChange(method: PaymentMethod) {
    setPaymentMethod(method)
    setSubmission(null)
    setSubmitError(null)
  }

  function handleShippingChange(id: string) {
    setSelectedShippingId(id)
    setShippingError(null)
    setSubmission(null)
    setSubmitError(null)
  }

  function handleCalculateShipping() {
    const cep = onlyDigits(form.cep)

    if (cep.length !== 8) {
      setShippingError('Informe um CEP de destino com 8 dígitos.')
      document.getElementById('checkout-shipping-cep')?.focus()
      return
    }

    setShippingError(null)
    setShippingQuoteTrigger((current) => current + 1)
  }

  const selectedShipping =
    shippingOptions.find((option) => option.id === selectedShippingId) ?? null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validateCheckoutForm(form)
    setErrors(validation)

    if (Object.keys(validation).length > 0) {
      const firstField = Object.keys(validation)[0] as CheckoutFormField
      document.getElementById(`checkout-${firstField}`)?.focus()
      return
    }

    if (!selectedShipping) {
      setShippingError(
        shippingLoading
          ? 'Aguarde o cálculo do frete.'
          : 'Calcule o frete e selecione uma modalidade de envio antes de finalizar.',
      )
      document.getElementById('checkout-shipping')?.focus()
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = buildCheckoutPayload(
        form,
        paymentMethod,
        lines,
        selectedShipping.id,
      )
      const result = await submitCheckout(payload)
      setSubmission(result)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o pedido.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Finalização"
        title="Checkout"
        description="Confirme seus dados de contato, endereço e forma de pagamento."
        crumbs={[
          { label: 'Início', to: '/' },
          { label: 'Sacola', to: '/carrinho' },
          { label: 'Checkout' },
        ]}
        meta={
          <span className="page-hero__count">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
        }
      />

      <section className="checkout-section">
        <div className="container">
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            <div className="checkout-layout">
              <div className="checkout-main">
                <section className="checkout-panel" aria-labelledby="buyer-title">
                  <div className="checkout-panel__heading">
                    <span className="checkout-panel__index">01</span>
                    <div>
                      <h2 id="buyer-title">Dados do comprador</h2>
                      <p>Informações para contato e identificação do pedido.</p>
                    </div>
                  </div>

                  {hasSavedData ? (
                    <button
                      type="button"
                      className="checkout-clear-saved"
                      onClick={handleClearSavedData}
                    >
                      Limpar dados salvos
                    </button>
                  ) : null}

                  <div className="checkout-field-grid">
                    <CheckoutField
                      id="checkout-fullName"
                      label="Nome completo"
                      value={form.fullName}
                      onChange={(value) => handleFieldChange('fullName', value)}
                      error={errors.fullName}
                      autoComplete="name"
                      placeholder="Seu nome completo"
                      fullWidth
                    />
                    <CheckoutField
                      id="checkout-cpf"
                      label="CPF"
                      value={form.cpf}
                      onChange={(value) => handleFieldChange('cpf', value)}
                      error={errors.cpf}
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="000.000.000-00"
                    />
                    <CheckoutField
                      id="checkout-phone"
                      label="Telefone / WhatsApp"
                      value={form.phone}
                      onChange={(value) => handleFieldChange('phone', value)}
                      error={errors.phone}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={15}
                      placeholder="(00) 00000-0000"
                    />
                    <CheckoutField
                      id="checkout-email"
                      label="E-mail"
                      value={form.email}
                      onChange={(value) => handleFieldChange('email', value)}
                      error={errors.email}
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      fullWidth
                    />
                  </div>
                </section>

                <section className="checkout-panel" aria-labelledby="address-title">
                  <div className="checkout-panel__heading">
                    <span className="checkout-panel__index">02</span>
                    <div>
                      <h2 id="address-title">Endereço de entrega</h2>
                      <p>O destino será usado para o cálculo do frete.</p>
                    </div>
                  </div>

                  <div className="checkout-field-grid">
                    <CheckoutField
                      id="checkout-cep"
                      label="CEP"
                      value={form.cep}
                      onChange={(value) => handleFieldChange('cep', value)}
                      error={errors.cep}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
                      placeholder="00000-000"
                    />
                    <CheckoutField
                      id="checkout-number"
                      label="Número"
                      value={form.number}
                      onChange={(value) => handleFieldChange('number', value)}
                      error={errors.number}
                      placeholder="123"
                    />
                    <CheckoutField
                      id="checkout-street"
                      label="Rua"
                      value={form.street}
                      onChange={(value) => handleFieldChange('street', value)}
                      error={errors.street}
                      autoComplete="address-line1"
                      placeholder="Nome da rua"
                      fullWidth
                    />
                    <CheckoutField
                      id="checkout-complement"
                      label="Complemento"
                      value={form.complement}
                      onChange={(value) => handleFieldChange('complement', value)}
                      autoComplete="address-line2"
                      placeholder="Apto, bloco, referência"
                      required={false}
                    />
                    <CheckoutField
                      id="checkout-neighborhood"
                      label="Bairro"
                      value={form.neighborhood}
                      onChange={(value) => handleFieldChange('neighborhood', value)}
                      error={errors.neighborhood}
                      placeholder="Seu bairro"
                    />
                    <CheckoutField
                      id="checkout-city"
                      label="Cidade"
                      value={form.city}
                      onChange={(value) => handleFieldChange('city', value)}
                      error={errors.city}
                      autoComplete="address-level2"
                      placeholder="Sua cidade"
                    />
                    <div
                      className={`checkout-field${
                        errors.state ? ' checkout-field--error' : ''
                      }`}
                    >
                      <label htmlFor="checkout-state">
                        Estado<span aria-hidden="true"> *</span>
                      </label>
                      <select
                        id="checkout-state"
                        name="checkout-state"
                        value={form.state}
                        onChange={(event) =>
                          handleFieldChange('state', event.target.value)
                        }
                        aria-invalid={Boolean(errors.state)}
                        aria-describedby={
                          errors.state ? 'checkout-state-error' : undefined
                        }
                        required
                      >
                        <option value="">UF</option>
                        {brazilianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      {errors.state ? (
                        <p
                          className="checkout-field__error"
                          id="checkout-state-error"
                        >
                          {errors.state}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <p className="checkout-panel__note">
                    O CEP informado será usado para calcular as opções de
                    frete disponíveis.
                  </p>
                </section>

                <CheckoutShipping
                  cep={form.cep}
                  cepError={errors.cep ?? null}
                  options={shippingOptions}
                  selectedId={selectedShippingId}
                  loading={shippingLoading}
                  error={shippingError}
                  onCepChange={(value) => handleFieldChange('cep', value)}
                  onCalculate={handleCalculateShipping}
                  onSelect={handleShippingChange}
                />

                <section className="checkout-panel" aria-labelledby="payment-title">
                  <div className="checkout-panel__heading">
                    <span className="checkout-panel__index">04</span>
                    <div>
                      <h2 id="payment-title">Forma de pagamento</h2>
                      <p>Escolha como deseja pagar pelos produtos.</p>
                    </div>
                  </div>

                  <div
                    className="checkout-payment-options"
                    role="radiogroup"
                    aria-label="Forma de pagamento"
                  >
                    <label
                      className={`checkout-payment-card${
                        paymentMethod === 'pix' ? ' is-selected' : ''
                      }`}
                    >
                      <span className="checkout-payment-card__top">
                        <span>Pix</span>
                        <span>À vista</span>
                      </span>
                      <input
                        type="radio"
                        name="payment"
                        value="pix"
                        checked={paymentMethod === 'pix'}
                        onChange={() => handlePaymentChange('pix')}
                      />
                      <strong>{formatCurrency(subtotalPix)}</strong>
                      <span className="checkout-payment-card__note">no Pix</span>
                    </label>

                    <label
                      className={`checkout-payment-card${
                        paymentMethod === 'debit' ? ' is-selected' : ''
                      }`}
                    >
                      <span className="checkout-payment-card__top">
                        <span>Débito</span>
                        <span>Cartão</span>
                      </span>
                      <input
                        type="radio"
                        name="payment"
                        value="debit"
                        checked={paymentMethod === 'debit'}
                        onChange={() => handlePaymentChange('debit')}
                      />
                      <strong>{formatCurrency(subtotalDebit)}</strong>
                      <span className="checkout-payment-card__note">
                        no débito
                      </span>
                    </label>

                    <label
                      className={`checkout-payment-card${
                        paymentMethod === 'credit' ? ' is-selected' : ''
                      }`}
                    >
                      <span className="checkout-payment-card__top">
                        <span>Crédito</span>
                        <span>Em 3x</span>
                      </span>
                      <input
                        type="radio"
                        name="payment"
                        value="credit"
                        checked={paymentMethod === 'credit'}
                        onChange={() => handlePaymentChange('credit')}
                      />
                      <strong>{formatCurrency(installmentTotal)}</strong>
                      <span className="checkout-payment-card__note">
                        ou {formatInstallment(installmentTotal)}
                      </span>
                    </label>
                  </div>

                  <p className="checkout-panel__note">
                    Nenhuma cobrança é realizada nesta etapa. O pagamento será
                    processado somente após a integração com o Mercado Pago.
                  </p>
                </section>
              </div>

              <CheckoutSummary
                paymentMethod={paymentMethod}
                isSubmitting={isSubmitting}
                submission={submission}
                submitError={submitError}
                selectedShipping={selectedShipping}
              />
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
