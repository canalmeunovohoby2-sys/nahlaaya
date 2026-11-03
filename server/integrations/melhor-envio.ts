import type {
  ShippingQuoteRequest,
  ShippingQuoteResult,
} from '../../src/types/checkout'

export interface ShippingProvider {
  quote(request: ShippingQuoteRequest): Promise<ShippingQuoteResult>
}

export const melhorEnvioProvider: ShippingProvider = {
  async quote(_request: ShippingQuoteRequest): Promise<ShippingQuoteResult> {
    return {
      status: 'integration-pending',
      message:
        'Integração com o Melhor Envio ainda não configurada. Nenhum frete foi calculado.',
    }
  },
}
