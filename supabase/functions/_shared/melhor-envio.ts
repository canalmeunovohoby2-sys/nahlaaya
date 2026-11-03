import { HttpError } from './http.ts'

export const MELHOR_ENVIO_PROVIDER = 'melhor_envio'
export const MELHOR_ENVIO_SCOPES = 'shipping-calculate users-read'
export const MELHOR_ENVIO_STATE_TTL_MS = 10 * 60 * 1000

export interface MelhorEnvioTokenSet {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
  scope: string | null
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

function envValue(name: string): string {
  const value = Deno.env.get(name)?.trim()

  if (!value) {
    throw new HttpError(503, `Configuração ausente: ${name}.`)
  }

  return value
}

export function melhorEnvioApiOrigin(): string {
  return envValue('MELHOR_ENVIO_API_BASE')
    .replace(/\/+$/, '')
    .replace(/\/api\/v2$/, '')
}

export function melhorEnvioRedirectUri(): string {
  return envValue('MELHOR_ENVIO_REDIRECT_URI')
}

export function assertMelhorEnvioConfigured(): void {
  envValue('MELHOR_ENVIO_CLIENT_ID')
  envValue('MELHOR_ENVIO_CLIENT_SECRET')
  melhorEnvioRedirectUri()
  melhorEnvioApiOrigin()
  getEncryptionKey()
}

export function generateOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToBase64Url(bytes)
}

export async function hashOAuthState(state: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(state),
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function buildAuthorizationUrl(state: string): string {
  const url = new URL(`${melhorEnvioApiOrigin()}/oauth/authorize`)
  url.searchParams.set('client_id', envValue('MELHOR_ENVIO_CLIENT_ID'))
  url.searchParams.set('redirect_uri', melhorEnvioRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', MELHOR_ENVIO_SCOPES)
  url.searchParams.set('state', state)
  return url.toString()
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function getEncryptionKey(): Uint8Array {
  const key = base64ToBytes(envValue('MELHOR_ENVIO_TOKEN_ENCRYPTION_KEY'))

  if (key.byteLength !== 32) {
    throw new HttpError(
      503,
      'MELHOR_ENVIO_TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64.',
    )
  }

  return key
}

async function importEncryptionKey(keyBase64: string): Promise<CryptoKey> {
  const bytes = base64ToBytes(keyBase64)

  if (bytes.byteLength !== 32) {
    throw new Error('A chave de criptografia deve ter 32 bytes.')
  }

  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptWithKey(
  value: string,
  keyBase64: string,
): Promise<string> {
  const key = await importEncryptionKey(keyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  )

  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`
}

export async function decryptWithKey(
  value: string,
  keyBase64: string,
): Promise<string> {
  const [version, ivPart, cipherPart] = value.split('.')

  if (version !== 'v1' || !ivPart || !cipherPart) {
    throw new Error('Formato de token criptografado inválido.')
  }

  const key = await importEncryptionKey(keyBase64)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivPart) },
    key,
    base64ToBytes(cipherPart),
  )

  return new TextDecoder().decode(plaintext)
}

export async function encryptToken(value: string): Promise<string> {
  return encryptWithKey(value, bytesToBase64(getEncryptionKey()))
}

export async function decryptToken(value: string): Promise<string> {
  return decryptWithKey(value, bytesToBase64(getEncryptionKey()))
}

function tokenSetFromResponse(response: TokenResponse): MelhorEnvioTokenSet {
  if (!response.access_token) {
    throw new HttpError(502, 'Resposta de token inválida do Melhor Envio.')
  }

  const expiresIn = Number(response.expires_in ?? 0)
  const expiresAt = new Date(
    Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 0) * 1000,
  ).toISOString()

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresAt,
    scope: response.scope ?? null,
  }
}

async function requestToken(
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<MelhorEnvioTokenSet> {
  const response = await fetchImpl(`${melhorEnvioApiOrigin()}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  })

  if (!response.ok) {
    throw new HttpError(
      502,
      `O Melhor Envio recusou a solicitação de token (${response.status}).`,
    )
  }

  return tokenSetFromResponse((await response.json()) as TokenResponse)
}

export async function exchangeAuthorizationCode(
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MelhorEnvioTokenSet> {
  return requestToken(
    {
      grant_type: 'authorization_code',
      client_id: envValue('MELHOR_ENVIO_CLIENT_ID'),
      client_secret: envValue('MELHOR_ENVIO_CLIENT_SECRET'),
      redirect_uri: melhorEnvioRedirectUri(),
      code,
    },
    fetchImpl,
  )
}

export async function refreshMelhorEnvioToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MelhorEnvioTokenSet> {
  return requestToken(
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: envValue('MELHOR_ENVIO_CLIENT_ID'),
      client_secret: envValue('MELHOR_ENVIO_CLIENT_SECRET'),
    },
    fetchImpl,
  )
}

export async function fetchMelhorEnvioAccount(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string | null; name: string | null }> {
  const userAgent = Deno.env.get('MELHOR_ENVIO_USER_AGENT')?.trim()

  if (!userAgent) {
    return { id: null, name: null }
  }

  const response = await fetchImpl(`${melhorEnvioApiOrigin()}/api/v2/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': userAgent,
    },
  })

  if (!response.ok) {
    return { id: null, name: null }
  }

  const data = (await response.json()) as Record<string, unknown>
  const id =
    typeof data.id === 'string' || typeof data.id === 'number'
      ? String(data.id)
      : null
  const name =
    typeof data.name === 'string'
      ? data.name
      : typeof data.full_name === 'string'
        ? data.full_name
        : null

  return { id, name }
}
