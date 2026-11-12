import type {
  ShippingQuoteOption,
  ShippingQuoteRequest,
  ShippingQuoteResult,
} from '../types/checkout'
import {
  backendMode,
  supabaseAnonKey,
  supabaseUrl,
} from './supabase/client'

interface ShippingQuoteResponse {
  status?: string
  options?: unknown
  message?: string
}

function readOption(value: unknown): ShippingQuoteOption | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const option = value as Record<string, unknown>
  const id = typeof option.id === 'string' ? option.id : ''
  const label = typeof option.label === 'string' ? option.label : ''
  const company = typeof option.company === 'string' ? option.company : ''
  const priceCents = option.priceCents
  const estimatedDays = option.estimatedDays

  if (
    !id ||
    !label ||
    !company ||
    typeof priceCents !== 'number' ||
    !Number.isSafeInteger(priceCents) ||
    priceCents < 0 ||
    typeof estimatedDays !== 'number' ||
    !Number.isSafeInteger(estimatedDays) ||
    estimatedDays < 0
  ) {
    return null
  }

  return {
    id,
    label,
    company,
    priceCents,
    estimatedDays,
    deliveryMin:
      typeof option.deliveryMin === 'number' ? option.deliveryMin : null,
    deliveryMax:
      typeof option.deliveryMax === 'number' ? option.deliveryMax : null,
  }
}

export async function requestShippingQuote(
  request: ShippingQuoteRequest,
): Promise<ShippingQuoteResult> {
  if (backendMode !== 'supabase' || !supabaseUrl || !supabaseAnonKey) {
    return {
      status: 'integration-pending',
      message:
        'A cotação de frete está disponível apenas com a integração Supabase configurada.',
    }
  }

  let response: Response

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/calculate-shipping`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error(
      'Não foi possível consultar o frete agora. Tente novamente em instantes.',
    )
  }

  const data = (await response.json().catch(() => null)) as
    | ShippingQuoteResponse
    | null

  if (!response.ok) {
    throw new Error(
      data?.message || 'Não foi possível calcular o frete para este CEP.',
    )
  }

  if (!Array.isArray(data?.options)) {
    throw new Error('Resposta inválida da cotação de frete.')
  }

  const options = data.options
    .map(readOption)
    .filter((option): option is ShippingQuoteOption => option !== null)

  if (options.length === 0) {
    throw new Error(
      'Nenhum serviço de frete está disponível para este CEP.',
    )
  }

  return { status: 'quote', options }
}
