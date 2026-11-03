import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import {
  assertMelhorEnvioConfigured,
  buildAuthorizationUrl,
  generateOAuthState,
  hashOAuthState,
  MELHOR_ENVIO_STATE_TTL_MS,
} from '../_shared/melhor-envio.ts'
import { getServiceClient, requireAdmin } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  const headers = corsHeaders(request)

  try {
    const admin = await requireAdmin(request)
    assertMelhorEnvioConfigured()

    const appOrigin = Deno.env.get('APP_ORIGIN')?.trim()

    if (!appOrigin) {
      throw new HttpError(
        503,
        'APP_ORIGIN não configurado. Configure com https://nahlaaya.vercel.app.',
      )
    }

    const redirectUri = new URL(Deno.env.get('MELHOR_ENVIO_REDIRECT_URI')!)
    const expectedCallback = `${Deno.env.get('SUPABASE_URL')}/functions/v1/melhor-envio-oauth-callback`

    if (redirectUri.toString() !== expectedCallback) {
      throw new HttpError(
        503,
        'MELHOR_ENVIO_REDIRECT_URI não corresponde ao callback desta função.',
      )
    }

    const state = generateOAuthState()
    const stateHash = await hashOAuthState(state)
    const expiresAt = new Date(
      Date.now() + MELHOR_ENVIO_STATE_TTL_MS,
    ).toISOString()
    const client = getServiceClient()

    const { error } = await client.from('integration_oauth_states').insert({
      state_hash: stateHash,
      admin_user_id: admin.id,
      expires_at: expiresAt,
    })

    if (error) {
      throw new HttpError(500, 'Não foi possível iniciar a autorização.')
    }

    return jsonResponse(
      {
        authorizationUrl: buildAuthorizationUrl(state),
        expiresAt,
      },
      200,
      { ...headers, 'Cache-Control': 'no-store' },
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Não foi possível iniciar a integração.'

    return jsonResponse({ message }, status, headers)
  }
})
