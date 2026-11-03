import type { CheckoutPayload } from '../../src/types/checkout'

export interface PaymentProviderResult {
  status: 'integration-pending'
  message: string
}

export interface PaymentProvider {
  createPayment(payload: CheckoutPayload): Promise<PaymentProviderResult>
}

export const mercadoPagoProvider: PaymentProvider = {
  async createPayment(_payload: CheckoutPayload): Promise<PaymentProviderResult> {
    return {
      status: 'integration-pending',
      message:
        'Integração com o Mercado Pago ainda não configurada. Nenhuma cobrança foi realizada.',
    }
  },
}
