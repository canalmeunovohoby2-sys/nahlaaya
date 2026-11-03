import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import { enforceVisitRateLimit } from '../_shared/rate-limit.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertAllowedOrigin(request: Request): void {
  const allowedOrigin = Deno.env.get('APP_ORIGIN')
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
    await enforceVisitRateLimit(request)

    if (!request.headers.get('Content-Type')?.includes('application/json')) {
      throw new HttpError(415, 'Formato de requisição inválido.')
    }

    const raw = await request.text()

    if (raw.length > 512) {
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
    const sessionId =
      typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''

    if (!uuidPattern.test(sessionId)) {
      throw new HttpError(400, 'Sessão inválida.')
    }

    const client = getServiceClient()
    const { data, error } = await client.rpc('register_visit', {
      p_session_id: sessionId.toLowerCase(),
    })

    if (error) {
      throw new HttpError(500, 'Não foi possível registrar a visita.')
    }

    const recorded =
      typeof data === 'object' &&
      data !== null &&
      (data as { recorded?: unknown }).recorded === true

    return jsonResponse(
      { recorded },
      recorded ? 201 : 200,
      { ...headers, 'Cache-Control': 'no-store' },
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Não foi possível registrar a visita.'

    return jsonResponse({ message }, status, headers)
  }
})
