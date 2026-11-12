import { HttpError } from './http.ts'
import {
  decryptSecret,
  isEncryptionKeyConfigured,
  type EncryptedSecret,
} from './secret-crypto.ts'
import type { MercadoPagoConfig } from './mercadopago.ts'

type ServiceClient = ReturnType<
  typeof import('./supabase.ts').getServiceClient
>

export interface MercadoPagoSettingsRow {
  public_key: string | null
  access_token_ciphertext: string | null
  access_token_iv: string | null
  access_token_tag: string | null
  webhook_secret_ciphertext: string | null
  webhook_secret_iv: string | null
  webhook_secret_tag: string | null
  validation_status: 'pending' | 'valid' | 'error'
  validation_message: string | null
  validated_at: string | null
}

export interface MercadoPagoSettingsSummary {
  status:
    | 'awaiting_credentials'
    | 'incomplete'
    | 'configured'
    | 'validated'
    | 'error'
  publicKeyConfigured: boolean
  accessTokenConfigured: boolean
  webhookSecretConfigured: boolean
  encryptionKeyConfigured: boolean
  validationMessage: string | null
  validatedAt: string | null
}

const SETTINGS_COLUMNS =
  'public_key,access_token_ciphertext,access_token_iv,access_token_tag,webhook_secret_ciphertext,webhook_secret_iv,webhook_secret_tag,validation_status,validation_message,validated_at'

export async function readMercadoPagoSettingsRow(
  client: ServiceClient,
): Promise<MercadoPagoSettingsRow | null> {
  const { data, error } = await client
    .from('mercadopago_settings')
    .select(SETTINGS_COLUMNS)
    .eq('id', true)
    .maybeSingle()

  if (error) {
    throw new HttpError(503, 'Não foi possível consultar as credenciais.')
  }

  return (data as MercadoPagoSettingsRow | null) ?? null
}

export function summarizeMercadoPagoSettings(
  row: MercadoPagoSettingsRow | null,
  env: { get(key: string): string | undefined } = Deno.env,
): MercadoPagoSettingsSummary {
  const publicKeyConfigured = Boolean(row?.public_key)
  const accessTokenConfigured = Boolean(
    row?.access_token_ciphertext &&
      row.access_token_iv &&
      row.access_token_tag,
  )
  const webhookSecretConfigured = Boolean(
    row?.webhook_secret_ciphertext &&
      row.webhook_secret_iv &&
      row.webhook_secret_tag,
  )
  const complete =
    publicKeyConfigured && accessTokenConfigured && webhookSecretConfigured

  let status: MercadoPagoSettingsSummary['status'] = 'awaiting_credentials'

  if (complete) {
    status =
      row?.validation_status === 'valid'
        ? 'validated'
        : row?.validation_status === 'error'
          ? 'error'
          : 'configured'
  } else if (
    publicKeyConfigured ||
    accessTokenConfigured ||
    webhookSecretConfigured
  ) {
    status = 'incomplete'
  }

  return {
    status,
    publicKeyConfigured,
    accessTokenConfigured,
    webhookSecretConfigured,
    encryptionKeyConfigured: isEncryptionKeyConfigured(env),
    validationMessage: row?.validation_message ?? null,
    validatedAt: row?.validated_at ?? null,
  }
}

export async function loadMercadoPagoConfig(
  client: ServiceClient,
  env: { get(key: string): string | undefined } = Deno.env,
): Promise<MercadoPagoConfig | null> {
  const row = await readMercadoPagoSettingsRow(client)

  if (!row || !row.access_token_ciphertext || !row.access_token_iv || !row.access_token_tag) {
    return null
  }

  if (
    !row.webhook_secret_ciphertext ||
    !row.webhook_secret_iv ||
    !row.webhook_secret_tag
  ) {
    return null
  }

  const accessToken = await decryptSecret(
    {
      ciphertext: row.access_token_ciphertext,
      iv: row.access_token_iv,
      tag: row.access_token_tag,
    } satisfies EncryptedSecret,
    env,
  )
  const webhookSecret = await decryptSecret(
    {
      ciphertext: row.webhook_secret_ciphertext,
      iv: row.webhook_secret_iv,
      tag: row.webhook_secret_tag,
    } satisfies EncryptedSecret,
    env,
  )

  return {
    accessToken,
    publicKey: row.public_key,
    webhookSecret,
  }
}

export async function requireMercadoPagoConfig(
  client: ServiceClient,
  env: { get(key: string): string | undefined } = Deno.env,
): Promise<MercadoPagoConfig> {
  const config = await loadMercadoPagoConfig(client, env)

  if (!config) {
    throw new HttpError(
      503,
      'Mercado Pago aguardando credenciais. Nenhuma cobrança foi realizada.',
    )
  }

  return config
}
