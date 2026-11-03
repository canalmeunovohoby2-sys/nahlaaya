import { supabase } from './client'
import { AdminApiError, notifyAdminUnauthorized } from '../../admin/errors'
import type {
  AdminCustomer,
  AdminDashboard,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProduct,
  ExpiredReservation,
  VisitStats,
} from '../../types/admin'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

async function adminRequest<T>(
  action: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase não configurado.')
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Sessão administrativa ausente.')
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/admin-api?action=${action}`,
    {
      method: options.method ?? 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
  )

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      notifyAdminUnauthorized()
    }

    throw new AdminApiError(
      response.status,
      payload?.message || 'Falha na operação administrativa.',
    )
  }

  return payload as T
}

export async function getSupabaseDashboard(): Promise<AdminDashboard> {
  return adminRequest<AdminDashboard>('dashboard')
}

export async function getSupabaseProducts(): Promise<AdminProduct[]> {
  const data = await adminRequest<{ products: AdminProduct[] }>('products')
  return data.products
}

export async function updateSupabaseProduct(
  id: string,
  values: { stock: number; active: boolean },
): Promise<AdminProduct> {
  const data = await adminRequest<{ product: AdminProduct }>(
    `product&id=${encodeURIComponent(id)}`,
    { method: 'PATCH', body: values },
  )
  return data.product
}

export async function getSupabaseOrders(): Promise<AdminOrderListItem[]> {
  const data = await adminRequest<{ orders: AdminOrderListItem[] }>('orders')
  return data.orders
}

export async function getSupabaseOrder(id: number): Promise<AdminOrderDetail> {
  const data = await adminRequest<{ order: AdminOrderDetail }>(
    `order&id=${id}`,
  )
  return data.order
}

export async function getSupabaseCustomers(): Promise<AdminCustomer[]> {
  const data = await adminRequest<{ customers: AdminCustomer[] }>('customers')
  return data.customers
}

export async function updateSupabasePaymentStatus(
  id: number,
  status: string,
): Promise<AdminOrderDetail> {
  const data = await adminRequest<{ order: AdminOrderDetail }>(
    `payment&id=${id}`,
    { method: 'PATCH', body: { status } },
  )
  return data.order
}

export async function updateSupabaseDeliveryStatus(
  id: number,
  status: string,
): Promise<AdminOrderDetail> {
  const data = await adminRequest<{ order: AdminOrderDetail }>(
    `delivery&id=${id}`,
    { method: 'PATCH', body: { status } },
  )
  return data.order
}

export async function getSupabaseVisitStats(): Promise<VisitStats> {
  return adminRequest<VisitStats>('visits')
}

export async function getSupabaseExpiredReservations(): Promise<ExpiredReservation[]> {
  return adminRequest<ExpiredReservation[]>('expired-reservations')
}

export async function releaseSupabaseExpiredReservations(): Promise<number> {
  const data = await adminRequest<{ released: number }>('release-expired', {
    method: 'PATCH',
  })
  return data.released
}

export interface ProductImageInput {
  base64: string
  contentType: string
}

export interface ProductEditorInput {
  name: string
  brand: string
  volumeMl: number
  concentration: string
  description: string
  category: 'masculino' | 'feminino'
  priceCents: number
  stock: number
  active: boolean
  image?: ProductImageInput | null
}

export async function createSupabaseProduct(
  input: ProductEditorInput,
): Promise<AdminProduct> {
  const data = await adminRequest<{ product: AdminProduct }>('products', {
    method: 'POST',
    body: input,
  })
  return data.product
}

export async function updateSupabaseProductDetails(
  id: string,
  input: ProductEditorInput,
): Promise<AdminProduct> {
  const data = await adminRequest<{ product: AdminProduct }>(
    `products&id=${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input },
  )
  return data.product
}

export async function deleteSupabaseProduct(id: string): Promise<void> {
  await adminRequest<{ deleted: boolean }>(
    `products&id=${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
