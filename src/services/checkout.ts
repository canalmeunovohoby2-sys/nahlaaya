import type {
  CheckoutPayload,
  CheckoutSubmissionResult,
} from '../types/checkout'
import { backendMode, supabase } from './supabase/client'

export async function submitCheckout(
  payload: CheckoutPayload,
): Promise<CheckoutSubmissionResult> {
  if (backendMode === 'supabase') {
    if (!supabase) {
      throw new Error('Supabase não configurado para criar pedidos.')
    }

    const { data, error } = await supabase.functions.invoke('create-order', {
      body: payload,
    })

    if (error) {
      throw new Error(error.message || 'Não foi possível registrar o pedido.')
    }

    if (!data?.order) {
      throw new Error('Resposta inválida do servidor de pedidos.')
    }

    return data as CheckoutSubmissionResult
  }

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | (CheckoutSubmissionResult & { message?: string })
    | null

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Não foi possível registrar o pedido. Tente novamente em instantes.',
    )
  }

  if (!data?.order) {
    throw new Error('Resposta inválida do servidor de pedidos.')
  }

  return data
}
