import type { Product } from '../types/product'
import { getProductById } from './catalog'

export const CART_STORAGE_KEY = 'nahla-aya.cart.v1'
const MAX_QUANTITY = 99

export interface CartLine {
  productId: string
  quantity: number
}

export interface CartTotals {
  itemCount: number
  totalItems: number
  subtotalPix: number
  subtotalDebit: number
  installmentTotal: number
  unavailableCount: number
}

export function addProductToCart(
  lines: CartLine[],
  product: Product,
  quantity = 1,
): CartLine[] {
  if (product.stock <= 0) {
    return lines
  }

  const requested = Math.max(1, Math.floor(quantity))
  const existing = lines.find((line) => line.productId === product.id)
  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + requested,
    product.stock,
    MAX_QUANTITY,
  )

  if (existing) {
    return lines.map((line) =>
      line.productId === product.id ? { ...line, quantity: nextQuantity } : line,
    )
  }

  return [...lines, { productId: product.id, quantity: nextQuantity }]
}

export function updateCartQuantity(
  lines: CartLine[],
  product: Product,
  quantity: number,
): CartLine[] {
  if (quantity <= 0 || product.stock <= 0) {
    return removeProductFromCart(lines, product.id)
  }

  const nextQuantity = Math.min(Math.floor(quantity), product.stock, MAX_QUANTITY)

  return lines.map((line) =>
    line.productId === product.id ? { ...line, quantity: nextQuantity } : line,
  )
}

export function removeProductFromCart(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId)
}

export function calculateCartTotals(
  lines: CartLine[],
  lookup: (id: string) => Product | undefined = getProductById,
): CartTotals {
  return lines.reduce<CartTotals>(
    (totals, line) => {
      const product = lookup(line.productId)

      if (!product) {
        return {
          ...totals,
          unavailableCount: totals.unavailableCount + 1,
        }
      }

      return {
        itemCount: totals.itemCount + 1,
        totalItems: totals.totalItems + line.quantity,
        subtotalPix: totals.subtotalPix + product.pixPrice * line.quantity,
        subtotalDebit: totals.subtotalDebit + product.debitPrice * line.quantity,
        installmentTotal:
          totals.installmentTotal + product.installmentTotal * line.quantity,
        unavailableCount: totals.unavailableCount,
      }
    },
    {
      itemCount: 0,
      totalItems: 0,
      subtotalPix: 0,
      subtotalDebit: 0,
      installmentTotal: 0,
      unavailableCount: 0,
    },
  )
}

export function readStoredCart(): CartLine[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    const merged = new Map<string, number>()

    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'productId' in item &&
        'quantity' in item &&
        typeof item.productId === 'string' &&
        typeof item.quantity === 'number' &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
      ) {
        const quantity = Math.min(Math.floor(item.quantity), MAX_QUANTITY)
        merged.set(item.productId, (merged.get(item.productId) ?? 0) + quantity)
      }
    }

    return [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity: Math.min(quantity, MAX_QUANTITY),
    }))
  } catch {
    return []
  }
}

export function writeStoredCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serialized = JSON.stringify(lines)
    const current = window.localStorage.getItem(CART_STORAGE_KEY)

    if (current !== serialized) {
      window.localStorage.setItem(CART_STORAGE_KEY, serialized)
    }
  } catch {
    return
  }
}
