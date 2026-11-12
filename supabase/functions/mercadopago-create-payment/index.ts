import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import {
  buildMercadoPagoPaymentPayload,
  buildPublicPaymentResponse,
  createMercadoPagoPayment,
  getMercadoPagoPayment,
  paymentMatchesOrder,
} from '../_shared/mercadopago.ts'
import { requireMercadoPagoConfig } from '../_shared/mercadopago-credentials.ts'
import { verifyOrderAccessToken } from '../_shared/order-access.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'
import { getServiceClient } from '../_shared/supabase.ts'

function assertAllowedOrigin(request: Request): void {
  const allowedOrigin = Deno.env.get('APP_ORIGIN')?.trim()
  const requestOrigin = request.headers.get('Origin')

  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    throw new HttpError(403, 'Origem não permitida.')
  }
}

interface OrderRow {
  id: number
  order_number: string
  payment_method: 'pix' | 'credit' | 'debit'
  total_cents: number
  payment_status: string
  reservation_expires_at: string | null
  customer_id: number
  payment_provider: string | null
  payment_reference: string | null
}

interface CustomerRow {
  email: string
  cpf: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  const headers = corsHeaders(request)

  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Método não permitido.' }, 405, headers)
  }

  try {
    assertAllowedOrigin(request)
    await enforceRateLimit(request, 10, 10 * 60 * 1000)

    if (!request.headers.get('Content-Type')?.includes('application/json')) {
      throw new HttpError(415, 'Formato de requisição inválido.')
    }

    const raw = await request.text()

    if (raw.length > 8_192) {
      throw new HttpError(413, 'Requisição muito grande.')
    }

    let body: Record<string, unknown>

    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      throw new HttpError(400, 'Dados inválidos.')
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new HttpError(400, 'Dados inválidos.')
    }

    const orderAccessToken =
      typeof body.orderAccessToken === 'string'
        ? body.orderAccessToken.trim()
        : ''

    if (!orderAccessToken) {
      throw new HttpError(401, 'Acesso ao pedido não autorizado.')
    }

    const orderAccess = await verifyOrderAccessToken(orderAccessToken)
    const orderId = orderAccess.orderId
    const orderNumber = orderAccess.orderNumber
    const cardToken =
      typeof body.cardToken === 'string' ? body.cardToken.trim() : ''
    const cardPaymentMethodId =
      typeof body.paymentMethodId === 'string'
        ? body.paymentMethodId.trim()
        : ''
    const installments =
      typeof body.installments === 'number' ? body.installments : 1

    const client = getServiceClient()
    const config = await requireMercadoPagoConfig(client)

    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select(
        'id,order_number,payment_method,total_cents,payment_status,reservation_expires_at,customer_id,payment_provider,payment_reference',
      )
      .eq('id', orderId)
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError) {
      throw new HttpError(503, 'Não foi possível consultar o pedido.')
    }

    if (!orderData) {
      throw new HttpError(404, 'Pedido não encontrado.')
    }

    const order = orderData as OrderRow

    if (order.payment_status !== 'pending') {
      throw new HttpError(409, 'O pedido não está pendente de pagamento.')
    }

    if (
      order.reservation_expires_at &&
      new Date(order.reservation_expires_at).getTime() <= Date.now()
    ) {
      throw new HttpError(409, 'A reserva de estoque do pedido expirou.')
    }

    const { data: customerData, error: customerError } = await client
      .from('customers')
      .select('email,cpf')
      .eq('id', order.customer_id)
      .maybeSingle()

    if (customerError || !customerData) {
      throw new HttpError(503, 'Não foi possível consultar o comprador.')
    }

    const customer = customerData as CustomerRow

    if (order.payment_provider === 'mercadopago' && order.payment_reference) {
      const existingPayment = await getMercadoPagoPayment(
        config,
        order.payment_reference,
      )

      if (!paymentMatchesOrder(existingPayment, order.id, order.total_cents)) {
        throw new HttpError(409, 'Pagamento existente não corresponde ao pedido.')
      }

      return jsonResponse(
        buildPublicPaymentResponse(
          existingPayment,
          order.payment_reference,
          order.order_number,
        ),
        200,
        headers,
      )
    }

    const webhookUrl =
      Deno.env.get('MERCADO_PAGO_WEBHOOK_URL')?.trim() ||
      `${Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '')}/functions/v1/mercadopago-webhook`

    if (!webhookUrl.startsWith('https://')) {
      throw new HttpError(503, 'URL do webhook do Mercado Pago não configurada.')
    }

    const paymentPayload = buildMercadoPagoPaymentPayload(
      {
        id: order.id,
        orderNumber: order.order_number,
        paymentMethod: order.payment_method,
        totalCents: order.total_cents,
        buyerEmail: customer.email,
        buyerCpf: customer.cpf,
        description: `Pedido ${order.order_number} — Nahla Aya`,
      },
      webhookUrl,
      cardToken
        ? {
            token: cardToken,
            installments,
            paymentMethodId: cardPaymentMethodId || undefined,
          }
        : undefined,
    )

    const payment = await createMercadoPagoPayment(
      config,
      paymentPayload,
      `nahla-aya-order-${order.id}-${order.payment_method}`,
    )

    const paymentId = payment.id

    if (
      (typeof paymentId !== 'string' && typeof paymentId !== 'number') ||
      String(paymentId).trim() === ''
    ) {
      throw new HttpError(502, 'Resposta inválida do Mercado Pago.')
    }

    await client
      .from('orders')
      .update({
        payment_provider: 'mercadopago',
        payment_reference: String(paymentId),
      })
      .eq('id', order.id)
      .eq('payment_status', 'pending')

    return jsonResponse(
      {
        provider: 'mercadopago',
        paymentId: String(paymentId),
        status: payment.status ?? 'pending',
        orderNumber: order.order_number,
      },
      201,
      headers,
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível criar o pagamento.'

    return jsonResponse({ message }, status, headers)
  }
})
