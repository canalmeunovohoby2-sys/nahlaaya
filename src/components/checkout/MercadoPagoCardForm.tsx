import { useEffect, useId, useRef, useState } from 'react'
import { loadMercadoPago } from '@mercadopago/sdk-js'

interface CardTokenData {
  token: string
  paymentMethodId: string
  installments: number
}

interface CardFormController {
  getCardFormData(): Record<string, unknown>
  unmount?: () => void
}

interface MercadoPagoInstance {
  cardForm(options: Record<string, unknown>): CardFormController
}

interface MercadoPagoConstructor {
  new (
    publicKey: string,
    options?: Record<string, unknown>,
  ): MercadoPagoInstance
}

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor
  }
}

interface MercadoPagoCardFormProps {
  publicKey: string
  amount: number
  payerName: string
  payerEmail: string
  payerCpf: string
  disabled?: boolean
  onPay: (data: CardTokenData) => Promise<void> | void
}

export function MercadoPagoCardForm({
  publicKey,
  amount,
  payerName,
  payerEmail,
  payerCpf,
  disabled = false,
  onPay,
}: MercadoPagoCardFormProps) {
  const rawId = useId()
  const id = rawId.replace(/:/g, '')
  const formId = `checkout-card-form-${id}`
  const controllerRef = useRef<CardFormController | null>(null)
  const onPayRef = useRef(onPay)
  const processingRef = useRef(false)
  const disabledRef = useRef(disabled)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    onPayRef.current = onPay
    disabledRef.current = disabled
  }, [disabled, onPay])

  useEffect(() => {
    let active = true

    async function mount() {
      try {
        await loadMercadoPago()

        if (!active) {
          return
        }

        const MercadoPago = window.MercadoPago

        if (!MercadoPago) {
          throw new Error('SDK do Mercado Pago indisponível.')
        }

        const instance = new MercadoPago(publicKey, { locale: 'pt-BR' })
        controllerRef.current = instance.cardForm({
          amount: (amount / 100).toFixed(2),
          maxInstallments: 3,
          iframe: true,
          form: {
            id: formId,
            cardNumber: { id: `${formId}-number`, placeholder: 'Número do cartão' },
            expirationDate: {
              id: `${formId}-expiration`,
              placeholder: 'MM/AA',
            },
            securityCode: {
              id: `${formId}-security`,
              placeholder: 'CVV',
            },
            cardholderName: {
              id: `${formId}-name`,
              placeholder: 'Nome impresso no cartão',
            },
            issuer: { id: `${formId}-issuer`, placeholder: 'Banco emissor' },
            installments: {
              id: `${formId}-installments`,
              placeholder: 'Parcelas',
            },
            identificationType: {
              id: `${formId}-id-type`,
              placeholder: 'Tipo de documento',
            },
            identificationNumber: {
              id: `${formId}-id-number`,
              placeholder: 'CPF',
            },
            cardholderEmail: {
              id: `${formId}-email`,
              placeholder: 'E-mail',
            },
          },
          callbacks: {
            onFormMounted: (mountError?: unknown) => {
              if (mountError) {
                setError('Não foi possível carregar o formulário do cartão.')
                return
              }
              setReady(true)
            },
            onSubmit: (event: Event) => {
              event.preventDefault()
              const controller = controllerRef.current

              if (!controller || processingRef.current || disabledRef.current) {
                return
              }

              const data = controller.getCardFormData()
              const token = String(data.token ?? '').trim()
              const paymentMethodId = String(data.paymentMethodId ?? '').trim()
              const installments = Number(data.installments)

              if (!token || !paymentMethodId) {
                setError('Confira os dados do cartão e tente novamente.')
                return
              }

              processingRef.current = true
              setProcessing(true)
              setError(null)

              Promise.resolve(
                onPayRef.current({
                  token,
                  paymentMethodId,
                  installments:
                    Number.isSafeInteger(installments) && installments > 0
                      ? installments
                      : 1,
                }),
              ).catch(() => {
                setError('Não foi possível iniciar o pagamento. Tente novamente.')
              }).finally(() => {
                setProcessing(false)
              })
            },
            onError: () => {
              setError('Não foi possível validar os dados do cartão.')
            },
          },
        })
      } catch {
        if (active) {
          setError('Não foi possível carregar o SDK do Mercado Pago.')
        }
      }
    }

    void mount()

    return () => {
      active = false
      controllerRef.current?.unmount?.()
      controllerRef.current = null
    }
  }, [amount, formId, payerCpf, payerEmail, payerName, publicKey])

  return (
    <form
      id={formId}
      className="checkout-card-form"
      onSubmit={() => undefined}
    >
      <div className="checkout-card-form__grid">
        <div className="checkout-field checkout-card-form__wide">
          <label htmlFor={`${formId}-number`}>Número do cartão</label>
          <div id={`${formId}-number`} className="checkout-card-form__iframe" />
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-expiration`}>Validade</label>
          <div id={`${formId}-expiration`} className="checkout-card-form__iframe" />
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-security`}>CVV</label>
          <div id={`${formId}-security`} className="checkout-card-form__iframe" />
        </div>
        <div className="checkout-field checkout-card-form__wide">
          <label htmlFor={`${formId}-name`}>Nome impresso no cartão</label>
          <input
            id={`${formId}-name`}
            name="cardholderName"
            defaultValue={payerName}
            autoComplete="cc-name"
          />
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-issuer`}>Banco emissor</label>
          <select id={`${formId}-issuer`} name="issuer" />
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-installments`}>Parcelas</label>
          <select id={`${formId}-installments`} name="installments" />
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-id-type`}>Tipo de documento</label>
          <select id={`${formId}-id-type`} name="identificationType">
            <option value="CPF">CPF</option>
          </select>
        </div>
        <div className="checkout-field">
          <label htmlFor={`${formId}-id-number`}>CPF do titular</label>
          <input
            id={`${formId}-id-number`}
            name="identificationNumber"
            defaultValue={payerCpf}
            inputMode="numeric"
            readOnly
          />
        </div>
        <div className="checkout-field checkout-card-form__wide">
          <label htmlFor={`${formId}-email`}>E-mail</label>
          <input
            id={`${formId}-email`}
            name="cardholderEmail"
            type="email"
            defaultValue={payerEmail}
            readOnly
          />
        </div>
      </div>

      {error ? (
        <div className="checkout-card-form__error" role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn--gold btn--block checkout-card-form__submit"
        disabled={!ready || processing || disabled}
      >
        {processing ? 'Processando cartão...' : 'Pagar com cartão'}
      </button>
    </form>
  )
}
