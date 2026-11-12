import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
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

  if (request.method !== 'GET') {
    return jsonResponse({ message: 'Método não permitido.' }, 405, headers)
  }

  try {
    assertAllowedOrigin(request)
    await enforceRateLimit(request, 60, 10 * 60 * 1000)

    const client = getServiceClient()
    const { data, error } = await client
      .from('mercadopago_settings')
      .select('public_key')
      .eq('id', true)
      .maybeSingle()

    if (error) {
      throw new HttpError(503, 'Não foi possível consultar a Public Key.')
    }

    const publicKey =
      data && typeof data.public_key === 'string' && data.public_key.trim()
        ? data.public_key.trim()
        : null

    return jsonResponse(
      {
        publicKey,
        configured: Boolean(publicKey),
      },
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
