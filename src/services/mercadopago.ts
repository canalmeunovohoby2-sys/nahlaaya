import type { MercadoPagoPayment } from '../types/checkout'
import {
  supabaseAnonKey,
  supabaseUrl,
} from './supabase/client'

interface PublicKeyResponse {
  publicKey: string | null
  configured: boolean
}

interface FunctionErrorPayload {
  message?: string
}

function requireConfig(): { baseUrl: string; anonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase não configurado para processar pagamentos.')
  }

  return {
    baseUrl: supabaseUrl.replace(/\/+$/, ''),
    anonKey: supabaseAnonKey,
  }
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | FunctionErrorPayload
    | null

  return payload?.message || 'Não foi possível processar o pagamento.'
}

export async function getMercadoPagoPublicKey(): Promise<string | null> {
  const { baseUrl, anonKey } = requireConfig()
  const response = await fetch(`${baseUrl}/functions/v1/mercadopago-public-key`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const payload = (await response.json().catch(() => null)) as
    | PublicKeyResponse
    | null

  return payload?.publicKey?.trim() || null
}

export async function createMercadoPagoPayment(
  orderAccessToken: string,
  card?: {
    token: string
    paymentMethodId: string
    installments: number
  },
): Promise<MercadoPagoPayment> {
  const { baseUrl, anonKey } = requireConfig()
  const response = await fetch(
    `${baseUrl}/functions/v1/mercadopago-create-payment`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderAccessToken,
        ...(card
          ? {
              cardToken: card.token,
              paymentMethodId: card.paymentMethodId,
              installments: card.installments,
            }
          : {}),
      }),
    },
  )

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const payload = (await response.json().catch(() => null)) as
    | MercadoPagoPayment
    | null

  if (!payload?.paymentId) {
    throw new Error('Resposta inválida ao criar o pagamento.')
  }

  return payload
}

export async function getMercadoPagoPaymentStatus(
  orderAccessToken: string,
  paymentId?: string,
): Promise<MercadoPagoPayment> {
  const { baseUrl, anonKey } = requireConfig()
  const response = await fetch(
    `${baseUrl}/functions/v1/mercadopago-payment-status`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderAccessToken,
        ...(paymentId ? { paymentId } : {}),
      }),
    },
  )

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const payload = (await response.json().catch(() => null)) as
    | MercadoPagoPayment
    | null

  if (!payload?.paymentId) {
    throw new Error('Resposta inválida ao consultar o pagamento.')
  }

  return payload
}
