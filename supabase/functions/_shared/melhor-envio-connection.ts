import {
  decryptToken,
  encryptToken,
  MELHOR_ENVIO_PROVIDER,
  refreshMelhorEnvioToken,
} from './melhor-envio.ts'
import { HttpError } from './http.ts'
import { getServiceClient } from './supabase.ts'

export async function getValidMelhorEnvioAccessToken(
  client: ReturnType<typeof getServiceClient> = getServiceClient(),
): Promise<string | null> {
  const { data, error } = await client
    .from('integration_connections')
    .select(
      'access_token_encrypted,refresh_token_encrypted,token_expires_at,needs_reconnect,scope',
    )
    .eq('provider', MELHOR_ENVIO_PROVIDER)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  if (data.needs_reconnect) {
    throw new HttpError(409, 'Reconecte a conta do Melhor Envio.')
  }

  const expiresAt = new Date(data.token_expires_at).getTime()

  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return decryptToken(data.access_token_encrypted)
  }

  if (!data.refresh_token_encrypted) {
    await client
      .from('integration_connections')
      .update({ needs_reconnect: true })
      .eq('provider', MELHOR_ENVIO_PROVIDER)
    throw new HttpError(409, 'Reconecte a conta do Melhor Envio.')
  }

  try {
    const refreshToken = await decryptToken(data.refresh_token_encrypted)
    const refreshed = await refreshMelhorEnvioToken(refreshToken)
    const accessTokenEncrypted = await encryptToken(refreshed.accessToken)
    const refreshTokenEncrypted = await encryptToken(
      refreshed.refreshToken ?? refreshToken,
    )

    await client
      .from('integration_connections')
      .update({
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: refreshed.expiresAt,
        scope: refreshed.scope ?? data.scope,
        needs_reconnect: false,
      })
      .eq('provider', MELHOR_ENVIO_PROVIDER)

    return refreshed.accessToken
  } catch {
    await client
      .from('integration_connections')
      .update({ needs_reconnect: true })
      .eq('provider', MELHOR_ENVIO_PROVIDER)
    throw new HttpError(409, 'Reconecte a conta do Melhor Envio.')
  }
}
