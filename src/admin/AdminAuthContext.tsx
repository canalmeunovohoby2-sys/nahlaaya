import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from './api'
import { ADMIN_UNAUTHORIZED_EVENT } from './errors'
import { signOutSupabaseAdmin } from '../services/supabase/admin-auth'
import { backendMode, supabase } from '../services/supabase/client'
import type { AdminStatus } from './admin-auth-context'
import { AdminAuthContext } from './admin-auth-context'
import type { AdminUser } from '../types/admin'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  useEffect(() => {
    if (!pathname.startsWith('/admin')) {
      return
    }

    let active = true

    async function loadSession() {
      try {
        const session = await getAdminSession()

        if (!active) {
          return
        }

        if (session) {
          setAdmin(session.admin)
          setCsrfToken(session.csrfToken)
          setStatus('authenticated')
        } else {
          setAdmin(null)
          setCsrfToken(null)
          setStatus('unauthenticated')
        }
      } catch {
        if (active) {
          setAdmin(null)
          setCsrfToken(null)
          setStatus('unauthenticated')
        }
      }
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [pathname])


  useEffect(() => {
    function handleUnauthorized() {
      setAdmin(null)
      setCsrfToken(null)
      setStatus('unauthenticated')

      if (backendMode === 'supabase') {
        void signOutSupabaseAdmin()
      }
    }

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized)

    return () => {
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  useEffect(() => {
    if (backendMode !== 'supabase' || !supabase) {
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null)
        setCsrfToken(null)
        setStatus('unauthenticated')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginAdmin(email, password)
    setAdmin(session.admin)
    setCsrfToken(session.csrfToken)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      if (csrfToken) {
        await logoutAdmin(csrfToken)
      }
    } finally {
      setAdmin(null)
      setCsrfToken(null)
      setStatus('unauthenticated')
    }
  }, [csrfToken])

  const value = useMemo(
    () => ({ status, admin, csrfToken, login, logout }),
    [status, admin, csrfToken, login, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  )
}

