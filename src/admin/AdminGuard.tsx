import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './admin-auth-context'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="admin-loading" role="status">
        <span className="admin-loading__mark" />
        Verificando acesso administrativo...
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return children
}
