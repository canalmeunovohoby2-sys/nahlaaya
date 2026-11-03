import assert from 'node:assert/strict'
import test from 'node:test'
import { Buffer } from 'node:buffer'
import {
  buildAuthorizationUrl,
  decryptWithKey,
  encryptWithKey,
  generateOAuthState,
  hashOAuthState,
  refreshMelhorEnvioToken,
} from '../supabase/functions/_shared/melhor-envio.ts'

const key = Buffer.alloc(32, 7).toString('base64')

function installDenoEnv(values: Record<string, string>): void {
  ;(globalThis as unknown as {
    Deno: { env: { get: (name: string) => string | undefined } }
  }).Deno = {
    env: {
      get: (name) => values[name],
    },
  }
}

test('criptografa e descriptografa tokens com AES-GCM', async () => {
  const encrypted = await encryptWithKey('access-token-secreto', key)

  assert.notEqual(encrypted, 'access-token-secreto')
  assert.equal(await decryptWithKey(encrypted, key), 'access-token-secreto')
})

test('rejeita token criptografado adulterado', async () => {
  const encrypted = await encryptWithKey('token', key)
  const tampered = encrypted.slice(0, -2) + 'AA'

  await assert.rejects(() => decryptWithKey(tampered, key))
})

test('gera state aleatório e hash determinístico sem armazenar o valor bruto', async () => {
  const first = generateOAuthState()
  const second = generateOAuthState()

  assert.notEqual(first, second)
  assert.match(first, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(await hashOAuthState(first), await hashOAuthState(first))
  assert.notEqual(await hashOAuthState(first), await hashOAuthState(second))
})

test('monta URL de autorização com escopos mínimos e redirect fixo', () => {
  installDenoEnv({
    MELHOR_ENVIO_API_BASE: 'https://sandbox.melhorenvio.com.br',
    MELHOR_ENVIO_CLIENT_ID: 'client-id-de-teste',
    MELHOR_ENVIO_CLIENT_SECRET: 'client-secret-de-teste',
    MELHOR_ENVIO_REDIRECT_URI:
      'https://hjvkuuhdrvomeqsqirnw.supabase.co/functions/v1/melhor-envio-oauth-callback',
  })

  const url = new URL(buildAuthorizationUrl('state-de-teste'))

  assert.equal(url.origin, 'https://sandbox.melhorenvio.com.br')
  assert.equal(url.pathname, '/oauth/authorize')
  assert.equal(url.searchParams.get('response_type'), 'code')
  assert.equal(url.searchParams.get('state'), 'state-de-teste')
  assert.equal(url.searchParams.get('scope'), 'shipping-calculate users-read')
})

test('renova o token com resposta simulada do Melhor Envio', async () => {
  installDenoEnv({
    MELHOR_ENVIO_API_BASE: 'https://sandbox.melhorenvio.com.br',
    MELHOR_ENVIO_CLIENT_ID: 'client-id-de-teste',
    MELHOR_ENVIO_CLIENT_SECRET: 'client-secret-de-teste',
    MELHOR_ENVIO_REDIRECT_URI:
      'https://hjvkuuhdrvomeqsqirnw.supabase.co/functions/v1/melhor-envio-oauth-callback',
  })

  let requestedUrl = ''
  let requestedBody = ''
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input)
    requestedBody = String(init?.body ?? '')
    return new Response(
      JSON.stringify({
        access_token: 'novo-access-token',
        refresh_token: 'novo-refresh-token',
        expires_in: 2592000,
        scope: 'shipping-calculate users-read',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  const refreshed = await refreshMelhorEnvioToken('refresh-antigo', mockFetch)

  assert.equal(refreshed.accessToken, 'novo-access-token')
  assert.equal(refreshed.refreshToken, 'novo-refresh-token')
  assert.equal(requestedUrl, 'https://sandbox.melhorenvio.com.br/oauth/token')
  assert.match(requestedBody, /grant_type=refresh_token/)
  assert.match(requestedBody, /refresh_token=refresh-antigo/)
})
