import type {
  ShippingQuoteRequest,
  ShippingQuoteResult,
} from '../types/checkout'

export async function requestShippingQuote(
  request: ShippingQuoteRequest,
): Promise<ShippingQuoteResult> {
  void request

  return {
    status: 'integration-pending',
    message:
      'A integração com o Melhor Envio ainda não está configurada. O frete será calculado em uma próxima etapa.',
  }
}
