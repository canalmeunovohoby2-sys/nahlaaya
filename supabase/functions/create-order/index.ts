import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import { calculateServerShippingQuote } from '../_shared/melhor-envio-quote.ts'
import { signOrderAccessToken } from '../_shared/order-access.ts'
import {
  buildOrderShippingPayload,
  selectQuoteOption,
} from '../_shared/shipping-quote.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { normalizeCheckoutPayload } from '../_shared/validation.ts'

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
    const raw = await request.json()
    const payload = normalizeCheckoutPayload(raw)
    const client = getServiceClient()

    if (!payload.shippingServiceId) {
      throw new HttpError(422, 'Selecione uma modalidade de envio válida.')
    }

    const quote = await calculateServerShippingQuote(
      client,
      payload.items,
      payload.address.cep,
    )
    const selectedShipping = selectQuoteOption(
      quote.options,
      payload.shippingServiceId,
    )

    const { error: releaseError } = await client.rpc(
      'release_expired_order_reservations',
    )

    if (releaseError) {
      throw new HttpError(
        503,
        'Não foi possível preparar as reservas de estoque. Tente novamente.',
      )
    }

    const { data, error } = await client.rpc('create_order', {
      p_payload: {
        ...payload,
        shipping: buildOrderShippingPayload(quote, selectedShipping),
      },
    })

    if (error) {
      const status =
        error.code === 'P0001' || error.code === 'P0002' ? 409 : 400
      throw new HttpError(status, error.message)
    }

    return jsonResponse(
      {
        status: 'pending-payment',
        message:
          'Pedido recebido. Os itens ficam reservados durante o prazo de pagamento. O pagamento está pendente e nenhuma cobrança foi realizada.',
        order: data,
        orderAccessToken: await signOrderAccessToken(
          Number(data?.id),
          typeof data?.orderNumber === 'string' ? data.orderNumber : '',
        ),
      },
      201,
      corsHeaders(request),
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400
    const message =
      error instanceof Error ? error.message : 'Não foi possível criar o pedido.'

    return jsonResponse({ message }, status, corsHeaders(request))
  }
})
