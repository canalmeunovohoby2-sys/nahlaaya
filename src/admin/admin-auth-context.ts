import { createContext, useContext } from 'react'
import type { AdminUser } from '../types/admin'

export type AdminStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AdminAuthContextValue {
  status: AdminStatus
  admin: AdminUser | null
  csrfToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error('useAdminAuth precisa ser usado dentro de AdminAuthProvider')
  }

  return context
}
