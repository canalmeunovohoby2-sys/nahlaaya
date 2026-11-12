import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import {
  buildPublicPaymentResponse,
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
  payment_status: string
  payment_reference: string | null
  total_cents: number
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
    await enforceRateLimit(request, 20, 10 * 60 * 1000)

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

    const accessToken =
      typeof body.orderAccessToken === 'string'
        ? body.orderAccessToken.trim()
        : ''

    if (!accessToken) {
      throw new HttpError(401, 'Acesso ao pedido não autorizado.')
    }

    const orderAccess = await verifyOrderAccessToken(accessToken)
    const requestedPaymentId =
      typeof body.paymentId === 'string' ? body.paymentId.trim() : ''

    const client = getServiceClient()
    const config = await requireMercadoPagoConfig(client)

    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select('id,order_number,payment_status,payment_reference,total_cents')
      .eq('id', orderAccess.orderId)
      .eq('order_number', orderAccess.orderNumber)
      .maybeSingle()

    if (orderError) {
      throw new HttpError(503, 'Não foi possível consultar o pedido.')
    }

    if (!orderData) {
      throw new HttpError(404, 'Pedido não encontrado.')
    }

    const order = orderData as OrderRow

    if (
      requestedPaymentId &&
      order.payment_reference &&
      requestedPaymentId !== order.payment_reference
    ) {
      throw new HttpError(409, 'Pagamento não corresponde ao pedido.')
    }

    const paymentId = requestedPaymentId || order.payment_reference || ''

    if (!paymentId) {
      throw new HttpError(404, 'Pagamento ainda não iniciado.')
    }

    const payment = await getMercadoPagoPayment(config, paymentId)

    if (!paymentMatchesOrder(payment, order.id, order.total_cents)) {
      throw new HttpError(409, 'Pagamento não corresponde ao pedido.')
    }

    return jsonResponse(
      buildPublicPaymentResponse(payment, paymentId, order.order_number),
      200,
      { ...headers, 'Cache-Control': 'no-store' },
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Não foi possível consultar.'

    return jsonResponse({ message }, status, headers)
  }
})
