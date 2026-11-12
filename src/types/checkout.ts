export type PaymentMethod = 'pix' | 'debit' | 'credit'

export interface BuyerInfo {
  fullName: string
  cpf: string
  email: string
  phone: string
}

export interface ShippingAddress {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export interface CheckoutItem {
  productId: string
  quantity: number
}

export interface CheckoutPayload {
  buyer: BuyerInfo
  address: ShippingAddress
  paymentMethod: PaymentMethod
  items: CheckoutItem[]
  shippingServiceId?: string
}

export type IntegrationStatus = 'integration-pending'

export interface CheckoutOrderSummary {
  id: number
  orderNumber: string
  paymentStatus: string
  deliveryStatus: string
  totalCents: number
  createdAt: string
}

export interface CheckoutSubmissionResult {
  status: 'pending-payment'
  message: string
  order: CheckoutOrderSummary
  orderAccessToken?: string
}

export interface MercadoPagoPayment {
  provider: 'mercadopago'
  paymentId: string
  status: string
  statusDetail: string | null
  orderNumber: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export interface ShippingQuoteRequest {
  cep: string
  items: CheckoutItem[]
}

export interface ShippingQuoteOption {
  id: string
  label: string
  company: string
  priceCents: number
  estimatedDays: number
  deliveryMin: number | null
  deliveryMax: number | null
}

export type ShippingQuoteResult =
  | {
      status: 'quote'
      options: ShippingQuoteOption[]
    }
  | {
      status: IntegrationStatus
      message: string
    }
