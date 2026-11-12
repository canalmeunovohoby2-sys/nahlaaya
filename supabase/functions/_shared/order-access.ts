import { HttpError } from './http.ts'

export interface OrderAccessPayload {
  orderId: number
  orderNumber: string
  expiresAt: number
}

const TOKEN_VERSION = 'v1'
const TOKEN_TTL_SECONDS = 24 * 60 * 60

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

function readSecret(env: { get(key: string): string | undefined }): string {
  const secret = env.get('ORDER_ACCESS_TOKEN_SECRET')?.trim()

  if (!secret) {
    throw new HttpError(503, 'Chave interna de acesso ao pedido não configurada.')
  }

  return secret
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data),
  )

  return base64UrlEncode(
    [...new Uint8Array(digest)]
      .map((byte) => String.fromCharCode(byte))
      .join(''),
  )
}

export async function signOrderAccessToken(
  orderId: number,
  orderNumber: string,
  env: { get(key: string): string | undefined } = Deno.env,
): Promise<string> {
  if (!Number.isSafeInteger(orderId) || orderId <= 0 || !orderNumber.trim()) {
    throw new HttpError(500, 'Pedido inválido para emissão do token.')
  }

  const payload: OrderAccessPayload = {
    orderId,
    orderNumber: orderNumber.trim(),
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const encoded = base64UrlEncode(JSON.stringify(payload))
  const signature = await sign(`${TOKEN_VERSION}.${encoded}`, readSecret(env))

  return `${TOKEN_VERSION}.${encoded}.${signature}`
}

export async function verifyOrderAccessToken(
  token: string,
  env: { get(key: string): string | undefined } = Deno.env,
): Promise<OrderAccessPayload> {
  const parts = token.trim().split('.')

  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    throw new HttpError(401, 'Acesso ao pedido inválido.')
  }

  const [, encoded, signature] = parts
  const secret = readSecret(env)
  const expected = await sign(`${TOKEN_VERSION}.${encoded}`, secret)

  if (expected.length !== signature.length) {
    throw new HttpError(401, 'Acesso ao pedido inválido.')
  }

  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index)
  }

  if (difference !== 0) {
    throw new HttpError(401, 'Acesso ao pedido inválido.')
  }

  let payload: unknown

  try {
    payload = JSON.parse(base64UrlDecode(encoded))
  } catch {
    throw new HttpError(401, 'Acesso ao pedido inválido.')
  }

  if (!payload || typeof payload !== 'object') {
    throw new HttpError(401, 'Acesso ao pedido inválido.')
  }

  const value = payload as Partial<OrderAccessPayload>

  if (
    !Number.isSafeInteger(value.orderId) ||
    (value.orderId as number) <= 0 ||
    typeof value.orderNumber !== 'string' ||
    !value.orderNumber.trim() ||
    !Number.isSafeInteger(value.expiresAt) ||
    (value.expiresAt as number) <= Math.floor(Date.now() / 1000)
  ) {
    throw new HttpError(401, 'Acesso ao pedido expirado ou inválido.')
  }

  return {
    orderId: value.orderId as number,
    orderNumber: value.orderNumber,
    expiresAt: value.expiresAt as number,
  }
}
