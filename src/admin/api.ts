import type {
  AdminCustomer,
  AdminDashboard,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProduct,
  AdminSessionResponse,
  AdminUser,
} from '../types/admin'
import type { Session } from '@supabase/supabase-js'
import { AdminApiError, notifyAdminUnauthorized } from './errors'
import { notifyCatalogChanged } from '../lib/catalog'
import {
  createSupabaseProduct,
  deleteSupabaseProduct,
  getSupabaseCustomers,
  getSupabaseDashboard,
  getSupabaseOrder,
  getSupabaseOrders,
  getSupabaseProducts,
  updateSupabaseDeliveryStatus,
  updateSupabasePaymentStatus,
  updateSupabaseProduct,
  updateSupabaseProductDetails,
} from '../services/supabase/admin'
import type {
  ProductEditorInput,
} from '../services/supabase/admin'
import {
  signInSupabaseAdmin,
  signOutSupabaseAdmin,
} from '../services/supabase/admin-auth'
import { backendMode, supabase } from '../services/supabase/client'

export { AdminApiError } from './errors'

async function request<T>(
  path: string,
  options: RequestInit = {},
  csrfToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      notifyAdminUnauthorized()
    }

    throw new AdminApiError(
      response.status,
      data?.message || 'Não foi possível concluir a operação.',
    )
  }

  return data as T
}

function sessionFromSupabase(session: Session): AdminSessionResponse {
  const metadata = session.user.user_metadata as
    | Record<string, unknown>
    | undefined
  const metadataName =
    typeof metadata?.name === 'string'
      ? metadata.name
      : typeof metadata?.full_name === 'string'
        ? metadata.full_name
        : null
  const email = session.user.email ?? ''

  const admin: AdminUser = {
    id: session.user.id,
    name: metadataName || email.split('@')[0] || 'Administrador',
    email,
  }

  return {
    admin,
    csrfToken: 'supabase',
    expiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : '',
  }
}

async function getSupabaseAdminSession(): Promise<AdminSessionResponse | null> {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  const session = data.session

  if (!session?.user) {
    return null
  }

  try {
    await getSupabaseDashboard()
  } catch (error) {
    if (
      error instanceof AdminApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      await signOutSupabaseAdmin()
      return null
    }

    throw error
  }

  return sessionFromSupabase(session)
}

async function loginSupabaseAdmin(
  email: string,
  password: string,
): Promise<AdminSessionResponse> {
  try {
    await signInSupabaseAdmin(email, password)
  } catch (error) {
    throw new AdminApiError(
      401,
      error instanceof Error ? error.message : 'Não foi possível entrar.',
    )
  }

  const session = await getSupabaseAdminSession()

  if (!session) {
    await signOutSupabaseAdmin()
    throw new AdminApiError(403, 'Usuário sem permissão administrativa.')
  }

  return session
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<AdminSessionResponse> {
  if (backendMode === 'supabase') {
    return loginSupabaseAdmin(email, password)
  }

  return request<AdminSessionResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function getAdminSession(): Promise<AdminSessionResponse | null> {
  if (backendMode === 'supabase') {
    return getSupabaseAdminSession()
  }

  const data = await request<{
    admin: AdminSessionResponse['admin'] | null
    csrfToken: string | null
    expiresAt: string | null
  }>('/session')

  if (!data.admin || !data.csrfToken) {
    return null
  }

  return {
    admin: data.admin,
    csrfToken: data.csrfToken,
    expiresAt: data.expiresAt ?? '',
  }
}

export async function logoutAdmin(csrfToken: string): Promise<void> {
  if (backendMode === 'supabase') {
    await signOutSupabaseAdmin()
    return
  }

  await request('/logout', { method: 'POST' }, csrfToken)
}

export async function getDashboard(): Promise<AdminDashboard> {
  if (backendMode === 'supabase') {
    return getSupabaseDashboard()
  }

  return request<AdminDashboard>('/dashboard')
}

export async function getProducts(): Promise<AdminProduct[]> {
  if (backendMode === 'supabase') {
    return getSupabaseProducts()
  }

  const data = await request<{ products: AdminProduct[] }>('/products')
  return data.products
}

export async function updateProduct(
  id: string,
  values: { stock: number; active: boolean },
  csrfToken: string,
): Promise<AdminProduct> {
  if (backendMode === 'supabase') {
    const product = await updateSupabaseProduct(id, values)
    notifyCatalogChanged()
    return product
  }

  const data = await request<{ product: AdminProduct }>(
    `/products/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
    csrfToken,
  )
  return data.product
}

export async function getOrders(): Promise<AdminOrderListItem[]> {
  if (backendMode === 'supabase') {
    return getSupabaseOrders()
  }

  const data = await request<{ orders: AdminOrderListItem[] }>('/orders')
  return data.orders
}

export async function getOrder(id: number): Promise<AdminOrderDetail> {
  if (backendMode === 'supabase') {
    return getSupabaseOrder(id)
  }

  const data = await request<{ order: AdminOrderDetail }>(`/orders/${id}`)
  return data.order
}

export async function updatePaymentStatus(
  id: number,
  status: string,
  csrfToken: string,
): Promise<AdminOrderDetail> {
  if (backendMode === 'supabase') {
    return updateSupabasePaymentStatus(id, status)
  }

  const data = await request<{ order: AdminOrderDetail }>(
    `/orders/${id}/payment`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    csrfToken,
  )
  return data.order
}

export async function updateDeliveryStatus(
  id: number,
  status: string,
  csrfToken: string,
): Promise<AdminOrderDetail> {
  if (backendMode === 'supabase') {
    return updateSupabaseDeliveryStatus(id, status)
  }

  const data = await request<{ order: AdminOrderDetail }>(
    `/orders/${id}/delivery`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    csrfToken,
  )
  return data.order
}

export async function getCustomers(): Promise<AdminCustomer[]> {
  if (backendMode === 'supabase') {
    return getSupabaseCustomers()
  }

  const data = await request<{ customers: AdminCustomer[] }>('/customers')
  return data.customers
}

export async function createProduct(
  input: ProductEditorInput,
): Promise<AdminProduct> {
  if (backendMode === 'supabase') {
    const product = await createSupabaseProduct(input)
    notifyCatalogChanged()
    return product
  }

  throw new AdminApiError(
    501,
    'O cadastro de produtos está disponível no modo Supabase.',
  )
}

export async function updateProductDetails(
  id: string,
  input: ProductEditorInput,
): Promise<AdminProduct> {
  if (backendMode === 'supabase') {
    const product = await updateSupabaseProductDetails(id, input)
    notifyCatalogChanged()
    return product
  }

  throw new AdminApiError(
    501,
    'A edição completa de produtos está disponível no modo Supabase.',
  )
}

export async function deleteProduct(id: string): Promise<void> {
  if (backendMode === 'supabase') {
    await deleteSupabaseProduct(id)
    notifyCatalogChanged()
    return
  }

  throw new AdminApiError(
    501,
    'A exclusão de produtos está disponível no modo Supabase.',
  )
}
