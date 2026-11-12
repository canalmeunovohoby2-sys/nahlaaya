import { HttpError } from './http.ts'

export interface MercadoPagoConfig {
  accessToken: string
  publicKey: string | null
  webhookSecret: string
}

export interface MercadoPagoOrderInput {
  id: number
  orderNumber: string
  paymentMethod: 'pix' | 'credit' | 'debit'
  totalCents: number
  buyerEmail: string
  buyerCpf: string
  description: string
}

export interface MercadoPagoCardInput {
  token: string
  installments?: number
  paymentMethodId?: string
}

export interface MercadoPagoPaymentPayload {
  transaction_amount: number
  description: string
  external_reference: string
  notification_url: string
  metadata: {
    order_id: number
    order_number: string
  }
  payer: {
    email: string
    identification: {
      type: 'CPF'
      number: string
    }
  }
  payment_method_id?: string
  token?: string
  installments?: number
}

export interface PixPaymentData {
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export interface PublicPaymentResponse extends PixPaymentData {
  provider: 'mercadopago'
  paymentId: string
  status: string
  statusDetail: string | null
  orderNumber: string
}

export function extractPixPaymentData(
  payment: Record<string, unknown>,
): PixPaymentData {
  const point = payment.point_of_interaction
  const transaction =
    point && typeof point === 'object'
      ? (point as Record<string, unknown>).transaction_data
      : null
  const data =
    transaction && typeof transaction === 'object'
      ? (transaction as Record<string, unknown>)
      : null

  const stringField = (key: string): string | null => {
    const value = data?.[key]
    return typeof value === 'string' && value.trim() ? value : null
  }

  return {
    qrCode: stringField('qr_code'),
    qrCodeBase64: stringField('qr_code_base64'),
    ticketUrl: stringField('ticket_url'),
  }
}

export function buildPublicPaymentResponse(
  payment: Record<string, unknown>,
  paymentId: string,
  orderNumber: string,
): PublicPaymentResponse {
  return {
    provider: 'mercadopago',
    paymentId,
    status: typeof payment.status === 'string' ? payment.status : 'pending',
    statusDetail:
      typeof payment.status_detail === 'string' ? payment.status_detail : null,
    orderNumber,
    ...extractPixPaymentData(payment),
  }
}

export type MercadoPagoPaymentState =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'chargeback'

export function buildMercadoPagoPaymentPayload(
  order: MercadoPagoOrderInput,
  notificationUrl: string,
  card?: MercadoPagoCardInput,
): MercadoPagoPaymentPayload {
  if (!Number.isSafeInteger(order.id) || order.id <= 0) {
    throw new HttpError(400, 'Pedido inválido.')
  }

  if (!Number.isSafeInteger(order.totalCents) || order.totalCents <= 0) {
    throw new HttpError(422, 'Valor do pedido inválido.')
  }

  if (!order.buyerEmail.trim()) {
    throw new HttpError(422, 'E-mail do comprador não informado.')
  }

  const cpf = order.buyerCpf.replace(/\D/g, '')

  if (cpf.length !== 11) {
    throw new HttpError(422, 'CPF do comprador inválido.')
  }

  if (!notificationUrl.startsWith('https://')) {
    throw new HttpError(422, 'URL de webhook inválida.')
  }

  const payload: MercadoPagoPaymentPayload = {
    transaction_amount: Number((order.totalCents / 100).toFixed(2)),
    description: order.description,
    external_reference: String(order.id),
    notification_url: notificationUrl,
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
    },
    payer: {
      email: order.buyerEmail.trim(),
      identification: {
        type: 'CPF',
        number: cpf,
      },
    },
  }

  if (order.paymentMethod === 'pix') {
    payload.payment_method_id = 'pix'
    return payload
  }

  if (!card || !card.token.trim()) {
    throw new HttpError(
      422,
      'Cartão exige tokenização segura no frontend antes da criação do pagamento.',
    )
  }

  const installments =
    order.paymentMethod === 'credit'
      ? (card.installments ?? 1)
      : 1

  if (
    !Number.isSafeInteger(installments) ||
    installments < 1 ||
    installments > 3
  ) {
    throw new HttpError(422, 'Parcelamento inválido.')
  }

  payload.token = card.token
  payload.installments = installments

  if (card.paymentMethodId?.trim()) {
    payload.payment_method_id = card.paymentMethodId.trim()
  } else if (order.paymentMethod === 'debit') {
    throw new HttpError(422, 'Modalidade do cartão de débito não informada.')
  }

  return payload
}

export function mapMercadoPagoPaymentState(
  status: string,
): MercadoPagoPaymentState {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'paid'
    case 'pending':
    case 'in_process':
    case 'in_mediation':
    case 'authorized':
      return 'pending'
    case 'cancelled':
      return 'cancelled'
    case 'refunded':
      return 'refunded'
    case 'charged_back':
      return 'chargeback'
    case 'rejected':
      return 'failed'
    default:
      return 'pending'
  }
}

export interface MercadoPagoRefund {
  id: string
  amountCents: number
  status: string | null
}

export function buildPaymentEventDedupeKey(
  paymentId: string,
  state: MercadoPagoPaymentState,
  refunds: readonly MercadoPagoRefund[] = [],
): string {
  const refundState =
    state === 'refunded'
      ? refunds
          .map((refund) => `${refund.id}:${refund.status ?? 'unknown'}`)
          .sort()
          .join(',')
      : 'no-refunds'

  return `payment:${paymentId}:${state}:${refundState}`
}

export async function getMercadoPagoRefunds(
  config: MercadoPagoConfig,
  paymentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MercadoPagoRefund[]> {
  const response = await fetchImpl(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new HttpError(502, 'Não foi possível consultar os reembolsos.')
  }

  const payload = (await response.json().catch(() => null)) as unknown
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? [payload]
      : []

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []

    const value = entry as Record<string, unknown>
    const id =
      typeof value.id === 'string' || typeof value.id === 'number'
        ? String(value.id)
        : ''
    const amount = Number(value.amount)

    if (!id || !Number.isFinite(amount) || amount < 0) {
      return []
    }

    return [
      {
        id,
        amountCents: Math.round(amount * 100),
        status: typeof value.status === 'string' ? value.status : null,
      },
    ]
  })
}

export function buildRefundEventReference(
  paymentId: string,
  refundId: string,
  status: string | null,
): string {
  return `mercadopago:refund:${paymentId}:${refundId}:${status ?? 'unknown'}`
}

export function approvedRefundTotalCents(
  refunds: readonly MercadoPagoRefund[],
): number {
  return refunds
    .filter((refund) => refund.status === 'approved')
    .reduce((sum, refund) => sum + refund.amountCents, 0)
}

export function readMercadoPagoNotificationId(
  body: Record<string, unknown>,
): string {
  const value = body.id

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new HttpError(400, 'ID da notificação não informado.')
  }

  const normalized = String(value).trim()

  if (!normalized) {
    throw new HttpError(400, 'ID da notificação não informado.')
  }

  return normalized
}

export function readMercadoPagoPaymentId(url: URL): string {
  const value = url.searchParams.get('data.id')?.trim()

  if (!value) {
    throw new HttpError(400, 'Pagamento não informado na notificação.')
  }

  return value.toLowerCase()
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function constantTimeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return difference === 0
}

export type PaymentConfirmationOutcome =
  | 'paid'
  | 'reservation_expired'
  | 'order_cancelled'
  | 'not_confirmed'

export type PaymentConfirmationDecision =
  | { kind: 'paid' }
  | { kind: 'reconciliation'; reason: PaymentConfirmationOutcome }
  | { kind: 'error'; message: string }

export function decidePaymentConfirmation(
  error: { message?: string } | null,
  result: unknown,
): PaymentConfirmationDecision {
  if (error) {
    return {
      kind: 'error',
      message: error.message || 'Falha ao confirmar o pagamento.',
    }
  }

  const outcome = classifyPaymentConfirmation(result)

  if (outcome === 'paid') {
    return { kind: 'paid' }
  }

  return { kind: 'reconciliation', reason: outcome }
}

export function classifyPaymentConfirmation(
  result: unknown,
): PaymentConfirmationOutcome {
  if (!result || typeof result !== 'object') {
    return 'not_confirmed'
  }

  const value = result as Record<string, unknown>

  if (value.reservationExpired === true) {
    return 'reservation_expired'
  }

  if (value.payment_status === 'paid') {
    return 'paid'
  }

  if (value.payment_status === 'cancelled') {
    return 'order_cancelled'
  }

  return 'not_confirmed'
}

export function paymentMatchesOrder(
  payment: Record<string, unknown>,
  orderId: number,
  totalCents: number,
): boolean {
  const reference = String(payment.external_reference ?? '')
  const amount = Number(payment.transaction_amount)

  return (
    reference === String(orderId) &&
    payment.currency_id === 'BRL' &&
    Number.isFinite(amount) &&
    Math.round(amount * 100) === totalCents
  )
}

function parseSignatureHeader(
  signature: string,
): { ts: string; v1: string } | null {
  const values = new Map<string, string[]>()

  for (const part of signature.split(',')) {
    const separator = part.indexOf('=')

    if (separator <= 0) {
      continue
    }

    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()

    if (key && value) {
      values.set(key, [...(values.get(key) ?? []), value])
    }
  }

  const timestamps = values.get('ts') ?? []
  const signatures = values.get('v1') ?? []

  if (
    timestamps.length !== 1 ||
    signatures.length !== 1 ||
    !/^[0-9]+$/.test(timestamps[0]) ||
    !/^[a-f0-9]{64}$/i.test(signatures[0])
  ) {
    return null
  }

  return { ts: timestamps[0], v1: signatures[0].toLowerCase() }
}

export async function verifyMercadoPagoWebhookSignature(
  secret: string,
  dataId: string,
  requestId: string | null,
  signature: string | null,
): Promise<boolean> {
  if (!secret || !signature) {
    return false
  }

  const parsed = parseSignatureHeader(signature)

  if (!parsed) {
    return false
  }

  const normalizedDataId = dataId.trim().toLowerCase()
  const normalizedRequestId = requestId?.trim() ?? ''
  const parts: string[] = []

  if (normalizedDataId) {
    parts.push(`id:${normalizedDataId}`)
  }

  if (normalizedRequestId) {
    parts.push(`request-id:${normalizedRequestId}`)
  }

  parts.push(`ts:${parsed.ts}`)

  const manifest = parts.join(';') + ';'
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(manifest),
  )
  const computed = toHex(new Uint8Array(digest))

  // Não aplicamos janela curta de tempo: o Mercado Pago pode reenviar
  // notificações legítimas. A idempotência do pedido/evento cobre reenvios.
  return constantTimeEqualHex(computed, parsed.v1)
}

export async function createMercadoPagoPayment(
  config: MercadoPagoConfig,
  payload: MercadoPagoPaymentPayload,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  if (!config.accessToken || !idempotencyKey.trim()) {
    throw new HttpError(503, 'Mercado Pago não configurado.')
  }

  const response = await fetchImpl('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null

  if (!response.ok || !data) {
    throw new HttpError(
      502,
      'Não foi possível criar o pagamento no Mercado Pago.',
    )
  }

  return data
}

export async function getMercadoPagoPayment(
  config: MercadoPagoConfig,
  paymentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  if (!config.accessToken || !paymentId.trim()) {
    throw new HttpError(503, 'Mercado Pago não configurado.')
  }

  const response = await fetchImpl(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  )

  const data = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null

  if (!response.ok || !data) {
    throw new HttpError(
      502,
      'Não foi possível consultar o pagamento no Mercado Pago.',
    )
  }

  return data
}
