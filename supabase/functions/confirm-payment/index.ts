import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import { getServiceClient, requireAdmin } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      { message: 'Método não permitido.' },
      405,
      corsHeaders(request),
    )
  }

  try {
    await requireAdmin(request)
    const body = await request.json()
    const orderId = Number(body.orderId)

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      throw new HttpError(400, 'Pedido inválido.')
    }

    const provider =
      typeof body.provider === 'string' && body.provider.length > 0
        ? body.provider
        : 'manual'
    const reference =
      typeof body.reference === 'string' && body.reference.length > 0
        ? body.reference
        : `manual-${orderId}`

    const client = getServiceClient()
    const { data, error } = await client.rpc('confirm_order_payment', {
      p_order_id: orderId,
      p_provider: provider,
      p_reference: reference,
    })

    if (error) {
      const status = error.code === 'P0001' || error.code === 'P0002' ? 409 : 400
      throw new HttpError(status, error.message)
    }

    const result = data as { reservationExpired?: boolean } | null

    if (result?.reservationExpired) {
      throw new HttpError(
        409,
        'Reserva de estoque expirada. O pedido foi cancelado e o estoque liberado.',
      )
    }

    return jsonResponse({ order: data }, 200, corsHeaders(request))
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento.'

    return jsonResponse({ message }, status, corsHeaders(request))
  }
})
