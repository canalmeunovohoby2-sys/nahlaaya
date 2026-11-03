import { handleOptions, HttpError } from '../_shared/http.ts'
import {
  assertMelhorEnvioConfigured,
  encryptToken,
  exchangeAuthorizationCode,
  fetchMelhorEnvioAccount,
  hashOAuthState,
  MELHOR_ENVIO_PROVIDER,
  MELHOR_ENVIO_SCOPES,
} from '../_shared/melhor-envio.ts'
import { getServiceClient } from '../_shared/supabase.ts'

function adminRedirect(
  appOrigin: string,
  status: 'connected' | 'error',
  message?: string,
): Response {
  const url = new URL('/admin/integracoes', appOrigin)
  url.searchParams.set('melhor_envio', status)

  if (message) {
    url.searchParams.set('message', message.slice(0, 300))
  }

  return Response.redirect(url.toString(), 302)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  const appOrigin = Deno.env.get('APP_ORIGIN')?.trim()

  if (!appOrigin) {
    return new Response(
      JSON.stringify({
        message:
          'APP_ORIGIN não configurado. Configure com https://nahlaaya.vercel.app.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    )
  }

  if (request.method !== 'GET') {
    return adminRedirect(appOrigin, 'error', 'Método não permitido.')
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const providerError = url.searchParams.get('error')

  if (providerError) {
    return adminRedirect(
      appOrigin,
      'error',
      'A autorização no Melhor Envio não foi concluída.',
    )
  }

  if (!code || !state) {
    return adminRedirect(appOrigin, 'error', 'Retorno de autorização inválido.')
  }

  try {
    assertMelhorEnvioConfigured()
    const client = getServiceClient()
    const stateHash = await hashOAuthState(state)
    const now = new Date().toISOString()

    const { data: consumedState, error: stateError } = await client
      .from('integration_oauth_states')
      .update({ used_at: now })
      .eq('state_hash', stateHash)
      .is('used_at', null)
      .gt('expires_at', now)
      .select('admin_user_id')
      .maybeSingle()

    if (stateError || !consumedState) {
      return adminRedirect(
        appOrigin,
        'error',
        'Estado de autorização inválido, expirado ou já utilizado.',
      )
    }

    const tokens = await exchangeAuthorizationCode(code)
    const account = await fetchMelhorEnvioAccount(tokens.accessToken).catch(
      () => ({ id: null, name: null }),
    )

    const accessTokenEncrypted = await encryptToken(tokens.accessToken)
    const refreshTokenEncrypted = tokens.refreshToken
      ? await encryptToken(tokens.refreshToken)
      : null

    const { error: upsertError } = await client
      .from('integration_connections')
      .upsert(
        {
          provider: MELHOR_ENVIO_PROVIDER,
          account_id: account.id,
          account_name: account.name,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: tokens.expiresAt,
          scope: tokens.scope ?? MELHOR_ENVIO_SCOPES,
          needs_reconnect: false,
          connected_by: consumedState.admin_user_id,
          connected_at: now,
          updated_at: now,
        },
        { onConflict: 'provider' },
      )

    if (upsertError) {
      return adminRedirect(
        appOrigin,
        'error',
        'Não foi possível salvar a conexão com o Melhor Envio.',
      )
    }

    return adminRedirect(appOrigin, 'connected')
  } catch (error) {
    const message =
      error instanceof HttpError
        ? error.message
        : 'Não foi possível concluir a conexão com o Melhor Envio.'

    return adminRedirect(appOrigin, 'error', message)
  }
})
