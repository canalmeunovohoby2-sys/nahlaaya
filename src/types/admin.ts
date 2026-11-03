export interface AdminUser {
  id: number | string
  name: string
  email: string
}

export interface AdminSessionResponse {
  admin: AdminUser
  csrfToken: string
  expiresAt: string
}

export type PaymentMethod = 'pix' | 'debit' | 'credit'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'failed'
export type DeliveryStatus =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface AdminOrderListItem {
  id: number
  order_number: string
  payment_method: PaymentMethod
  total_cents: number
  payment_status: PaymentStatus
  delivery_status: DeliveryStatus
  created_at: string
  customer_name: string
  customer_email: string
}

export interface AdminDashboard {
  revenueCents: number
  pendingPaymentCount: number
  paidOrderCount: number
  cancelledOrderCount: number
  soldItemCount: number
  recentOrders: AdminOrderListItem[]
}

export interface AdminProduct {
  id: string
  slug: string
  name: string
  brand: string
  volumeMl: number
  weightGrams: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  concentration: string
  description: string
  pixPriceCents: number
  debitPriceCents: number
  installmentTotalCents: number
  stock: number
  active: boolean
  category: string | null
  images: string[]
  updatedAt: string
}

export interface AdminOrderItem {
  id: number
  product_id: string
  product_name: string
  brand: string
  quantity: number
  unit_pix_cents: number
  unit_debit_cents: number
  unit_installment_cents: number
  line_pix_cents: number
  line_debit_cents: number
  line_installment_cents: number
}

export interface AdminOrderDetail {
  id: number
  order_number: string
  customer_id: number
  address_id: number
  payment_method: PaymentMethod
  subtotal_pix_cents: number
  subtotal_debit_cents: number
  installment_total_cents: number
  selected_total_cents: number
  shipping_total_cents: number | null
  total_cents: number
  payment_status: PaymentStatus
  delivery_status: DeliveryStatus
  created_at: string
  updated_at: string
  paid_at: string | null
  cancelled_at: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_cpf: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  items: AdminOrderItem[]
}

export interface AdminCustomer {
  id: number
  full_name: string
  cpf: string
  email: string
  phone: string
  created_at: string
  order_count: number
  paid_total_cents: number
}

export interface VisitStats {
  total: number
  today: number
  last7Days: number
  timezone: string
}

export interface ExpiredReservation {
  id: number
  orderNumber: string
  createdAt: string
  reservationExpiresAt: string
  totalCents: number
  itemCount: number
}

export interface MelhorEnvioStatus {
  connected: boolean
  accountId: string | null
  accountName: string | null
  expiresAt: string | null
  needsReconnect: boolean
  connectedAt: string | null
  scope: string | null
}

export interface ShippingSettings {
  originCep: string | null
  perfumeWeightGrams: number | null
  boxWeightGrams: number | null
  boxLengthCm: number | null
  boxWidthCm: number | null
  boxHeightCm: number | null
  maxPerfumesPerBox: number | null
}
