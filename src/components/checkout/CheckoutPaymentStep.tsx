import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../../lib/format'
import {
  copyTextToClipboard,
  getMercadoPagoStatusLabel,
  getPixQrImageSource,
  isFinalMercadoPagoStatus,
} from '../../lib/mercadopago'
import {
  createMercadoPagoPayment,
  getMercadoPagoPaymentStatus,
  getMercadoPagoPublicKey,
} from '../../services/mercadopago'
import type {
  CheckoutSubmissionResult,
  MercadoPagoPayment,
  PaymentMethod,
} from '../../types/checkout'
import { MercadoPagoCardForm } from './MercadoPagoCardForm'

interface CheckoutPaymentStepProps {
  order: CheckoutSubmissionResult
  paymentMethod: PaymentMethod
  payerName: string
  payerEmail: string
  payerCpf: string
}

const POLL_INTERVAL_MS = 5_000

export function CheckoutPaymentStep({
  order,
  paymentMethod,
  payerName,
  payerEmail,
  payerCpf,
}: CheckoutPaymentStepProps) {
  const accessToken = order.orderAccessToken ?? ''
  const amountCents = order.order.totalCents
  const [payment, setPayment] = useState<MercadoPagoPayment | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const creatingRef = useRef(false)

  useEffect(() => {
    if (paymentMethod !== 'credit' && paymentMethod !== 'debit') {
      return
    }

    let active = true
    void getMercadoPagoPublicKey()
      .then((key) => {
        if (active) {
          setPublicKey(key)
          if (!key) {
            setPublicKeyError(
              'A Public Key do Mercado Pago ainda não foi configurada.',
            )
          }
        }
      })
      .catch((keyError: unknown) => {
        if (active) {
          setPublicKeyError(
            keyError instanceof Error
              ? keyError.message
              : 'Não foi possível carregar a Public Key.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [paymentMethod])

  async function createPixPayment() {
    if (!accessToken || creatingRef.current) {
      return
    }

    creatingRef.current = true
    setCreating(true)
    setError(null)

    try {
      const next = await createMercadoPagoPayment(accessToken)
      setPayment(next)
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Não foi possível gerar o Pix.',
      )
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  useEffect(() => {
    if (paymentMethod !== 'pix' || !accessToken) {
      return
    }

    void createPixPayment()
    // A criação é idempotente no backend; o ref evita chamadas simultâneas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, paymentMethod])

  useEffect(() => {
    if (!payment || !accessToken || isFinalMercadoPagoStatus(payment.status)) {
      return
    }

    let active = true
    const timer = window.setInterval(() => {
      void getMercadoPagoPaymentStatus(accessToken, payment.paymentId)
        .then((next) => {
          if (active) {
            setPayment(next)
          }
        })
        .catch(() => {
          // A cobrança existente permanece; o cliente pode tentar novamente.
        })
    }, POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [accessToken, payment])

  async function handleCardPayment(data: {
    token: string
    paymentMethodId: string
    installments: number
  }) {
    if (!accessToken || creatingRef.current) {
      return
    }

    creatingRef.current = true
    setCreating(true)
    setError(null)

    try {
      const next = await createMercadoPagoPayment(accessToken, data)
      setPayment(next)
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Não foi possível processar o cartão.',
      )
      throw paymentError
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  async function handleCopyPix() {
    const code = payment?.qrCode

    if (!code) {
      return
    }

    try {
      await copyTextToClipboard(code)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  if (!accessToken) {
    return (
      <section className="checkout-payment-step" role="alert">
        <strong>Não foi possível iniciar o pagamento.</strong>
        <p>Refaça o checkout para obter uma nova autorização do pedido.</p>
      </section>
    )
  }

  return (
    <section className="checkout-payment-step" aria-labelledby="payment-step-title">
      <div className="checkout-payment-step__heading">
        <p className="checkout-eyebrow">Pagamento</p>
        <h2 id="payment-step-title">Finalize seu pedido</h2>
        <p>
          Pedido {order.order.orderNumber} ·{' '}
          {formatCurrency(amountCents / 100)}
        </p>
      </div>

      {error ? (
        <div className="checkout-payment-step__error" role="alert">
          <p>{error}</p>
          {paymentMethod === 'pix' && !payment ? (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => void createPixPayment()}
              disabled={creating}
            >
              {creating ? 'Gerando...' : 'Tentar novamente'}
            </button>
          ) : null}
        </div>
      ) : null}

      {paymentMethod === 'pix' ? (
        <div className="checkout-payment-step__content">
          {creating ? <p>Gerando cobrança Pix...</p> : null}

          {payment ? (
            <>
              <div className={`checkout-payment-status status-${payment.status.toLowerCase()}`}>
                <strong>{getMercadoPagoStatusLabel(payment.status)}</strong>
                <span>
                  Status consultado no Mercado Pago. A confirmação definitiva do
                  pedido é feita pelo webhook.
                </span>
              </div>

              {payment.qrCodeBase64 || payment.qrCode ? (
                <div className="checkout-pix">
                  {getPixQrImageSource(payment.qrCodeBase64) ? (
                    <img
                      src={getPixQrImageSource(payment.qrCodeBase64) ?? ''}
                      alt="QR Code Pix"
                      width="220"
                      height="220"
                    />
                  ) : null}

                  {payment.qrCode ? (
                    <>
                      <p className="checkout-pix__label">Pix copia e cola</p>
                      <code className="checkout-pix__code">{payment.qrCode}</code>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => void handleCopyPix()}
                      >
                        {copyState === 'copied'
                          ? 'Código copiado'
                          : 'Copiar código Pix'}
                      </button>
                      {copyState === 'error' ? (
                        <p className="checkout-pix__hint">
                          Não foi possível copiar automaticamente. Selecione o
                          código acima e copie manualmente.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {payment.ticketUrl ? (
                    <a
                      className="checkout-pix__ticket"
                      href={payment.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir pagamento no Mercado Pago
                    </a>
                  ) : null}
                </div>
              ) : (
                <p>
                  O pagamento foi criado. Aguarde a atualização do status para
                  visualizar o QR Code.
                </p>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {paymentMethod === 'credit' || paymentMethod === 'debit' ? (
        <div className="checkout-payment-step__content">
          {publicKeyError ? (
            <div className="checkout-payment-step__error" role="alert">
              {publicKeyError}
            </div>
          ) : null}

          {publicKey ? (
            <MercadoPagoCardForm
              publicKey={publicKey}
              amount={amountCents}
              payerName={payerName}
              payerEmail={payerEmail}
              payerCpf={payerCpf}
              disabled={creating || Boolean(payment)}
              onPay={handleCardPayment}
            />
          ) : !publicKeyError ? (
            <p>Carregando formulário seguro do cartão...</p>
          ) : null}

          {payment ? (
            <div className={`checkout-payment-status status-${payment.status.toLowerCase()}`}>
              <strong>{getMercadoPagoStatusLabel(payment.status)}</strong>
              <span>
                O status abaixo é consultado no Mercado Pago. A confirmação
                definitiva do pedido é feita pelo webhook.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
