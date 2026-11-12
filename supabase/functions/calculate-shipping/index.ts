import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import { calculateServerShippingQuote } from '../_shared/melhor-envio-quote.ts'
import { enforceRateLimit } from '../_shared/rate-limit.ts'
import { getServiceClient } from '../_shared/supabase.ts'

function assertAllowedOrigin(request: Request): void {
  const allowedOrigin = Deno.env.get('APP_ORIGIN')?.trim()
  const requestOrigin = request.headers.get('Origin')

  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    throw new HttpError(403, 'Origem não permitida.')
  }
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

    if (raw.length > 16_384) {
      throw new HttpError(413, 'Requisição muito grande.')
    }

    let body: unknown

    try {
      body = JSON.parse(raw)
    } catch {
      throw new HttpError(400, 'Dados inválidos.')
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new HttpError(400, 'Dados inválidos.')
    }

    const payload = body as Record<string, unknown>
    const cep =
      typeof payload.cep === 'string' ? payload.cep : ''
    const items = Array.isArray(payload.items) ? payload.items : []

    const quote = await calculateServerShippingQuote(
      getServiceClient(),
      items as { productId: string; quantity: number }[],
      cep,
    )

    return jsonResponse(
      {
        status: 'quote',
        provider: 'melhor_envio',
        options: quote.options,
      },
      200,
      { ...headers, 'Cache-Control': 'no-store' },
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível calcular o frete.'

    return jsonResponse({ message }, status, headers)
  }
})
