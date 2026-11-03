import { createContext, useContext } from 'react'

export interface CatalogContextValue {
  refresh: () => Promise<void>
}

export const CatalogContext = createContext<CatalogContextValue | null>(null)

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext)

  if (!context) {
    throw new Error('useCatalog precisa ser usado dentro de CatalogProvider')
  }

  return context
}
