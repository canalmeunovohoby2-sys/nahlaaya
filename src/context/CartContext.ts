import { createContext } from 'react'
import type { CartLine } from '../lib/cart'

export interface CartContextValue {
  lines: CartLine[]
  totalItems: number
  subtotalPix: number
  subtotalDebit: number
  installmentTotal: number
  hasUnavailableItems: boolean
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
