import { HttpError } from './http.ts'

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  tag: string
}

type Env = { get(key: string): string | undefined }

const AES_GCM_TAG_LENGTH = 16
const AES_GCM_IV_LENGTH = 12

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(value: string, label: string): Uint8Array {
  try {
    const binary = atob(value)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    throw new HttpError(503, `Credencial protegida inválida: ${label}.`)
  }
}

function readKeyMaterial(env: Env): Uint8Array {
  const encoded = env.get('MERCADO_PAGO_ENCRYPTION_KEY')?.trim()

  if (!encoded) {
    throw new HttpError(
      503,
      'MERCADO_PAGO_ENCRYPTION_KEY não configurada no Supabase.',
    )
  }

  const material = fromBase64(encoded, 'chave de criptografia')

  if (material.length !== 32) {
    throw new HttpError(
      503,
      'MERCADO_PAGO_ENCRYPTION_KEY deve ter exatamente 32 bytes em base64.',
    )
  }

  return material
}

export function isEncryptionKeyConfigured(env: Env = Deno.env): boolean {
  try {
    readKeyMaterial(env)
    return true
  } catch {
    return false
  }
}

export async function readEncryptionKey(env: Env = Deno.env): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    readKeyMaterial(env),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptSecret(
  value: string,
  env: Env = Deno.env,
): Promise<EncryptedSecret> {
  if (!value) {
    throw new HttpError(400, 'Credencial vazia.')
  }

  const key = await readEncryptionKey(env)
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: AES_GCM_TAG_LENGTH * 8 },
      key,
      new TextEncoder().encode(value),
    ),
  )

  return {
    ciphertext: toBase64(encrypted.slice(0, -AES_GCM_TAG_LENGTH)),
    iv: toBase64(iv),
    tag: toBase64(encrypted.slice(-AES_GCM_TAG_LENGTH)),
  }
}

export async function decryptSecret(
  secret: EncryptedSecret,
  env: Env = Deno.env,
): Promise<string> {
  const key = await readEncryptionKey(env)
  const ciphertext = fromBase64(secret.ciphertext, 'texto cifrado')
  const iv = fromBase64(secret.iv, 'IV')
  const tag = fromBase64(secret.tag, 'tag')

  if (iv.length !== AES_GCM_IV_LENGTH || tag.length !== AES_GCM_TAG_LENGTH) {
    throw new HttpError(503, 'Credencial protegida inválida.')
  }

  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext)
  combined.set(tag, ciphertext.length)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: AES_GCM_TAG_LENGTH * 8 },
      key,
      combined,
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new HttpError(503, 'Não foi possível descriptografar a credencial.')
  }
}
