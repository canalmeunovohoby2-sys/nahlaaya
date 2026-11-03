import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CartContext } from './CartContext'
import {
  addProductToCart,
  calculateCartTotals,
  CART_STORAGE_KEY,
  readStoredCart,
  removeProductFromCart,
  updateCartQuantity,
  writeStoredCart,
} from '../lib/cart'
import type { CartLine } from '../lib/cart'
import { getProductById } from '../lib/catalog'

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart)

  useEffect(() => {
    writeStoredCart(lines)
  }, [lines])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === CART_STORAGE_KEY) {
        setLines(readStoredCart())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = useCallback((productId: string, quantity = 1) => {
    const product = getProductById(productId)

    if (!product) {
      return
    }

    setLines((current) => addProductToCart(current, product, quantity))
  }, [])

  const removeItem = useCallback((productId: string) => {
    setLines((current) => removeProductFromCart(current, productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const product = getProductById(productId)

    if (!product) {
      return
    }

    setLines((current) => updateCartQuantity(current, product, quantity))
  }, [])

  const clearCart = useCallback(() => {
    setLines([])
  }, [])

  const totals = useMemo(() => calculateCartTotals(lines), [lines])

  const value = useMemo(
    () => ({
      lines,
      totalItems: totals.totalItems,
      subtotalPix: totals.subtotalPix,
      subtotalDebit: totals.subtotalDebit,
      installmentTotal: totals.installmentTotal,
      hasUnavailableItems: totals.unavailableCount > 0,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [lines, totals, addItem, removeItem, updateQuantity, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
