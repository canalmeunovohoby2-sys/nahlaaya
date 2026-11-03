import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { products as fallbackProducts } from '../data/products'
import { CatalogContext } from './CatalogContext'
import { CATALOG_CHANGED_EVENT, setCatalogProducts } from '../lib/catalog'
import { fetchPublicProducts } from '../services/products'
import { backendMode } from '../services/supabase/client'

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(backendMode !== 'supabase')

  const refresh = useCallback(async () => {
    if (backendMode !== 'supabase') {
      setCatalogProducts(fallbackProducts)
      return
    }

    try {
      const remoteProducts = await fetchPublicProducts()
      setCatalogProducts(remoteProducts)
    } catch {
      setCatalogProducts(fallbackProducts)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()

    function handleCatalogChanged() {
      void refresh()
    }

    window.addEventListener(CATALOG_CHANGED_EVENT, handleCatalogChanged)

    return () => {
      window.removeEventListener(CATALOG_CHANGED_EVENT, handleCatalogChanged)
    }
  }, [refresh])

  const value = useMemo(() => ({ refresh }), [refresh])

  if (!ready) {
    return (
      <div className="catalog-loading" role="status">
        Carregando catálogo...
      </div>
    )
  }

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}
