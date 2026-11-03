import {
  emptyCheckoutForm,
  type CheckoutFormValues,
} from './checkout'

export const CHECKOUT_STORAGE_KEY = 'nahla-aya.checkout-customer.v1'

export interface CheckoutStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const fieldNames: (keyof CheckoutFormValues)[] = [
  'fullName',
  'cpf',
  'email',
  'phone',
  'cep',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
]

function browserStorage(): CheckoutStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function cleanValue(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 300) : ''
}

export function hasCheckoutData(values: CheckoutFormValues): boolean {
  return fieldNames.some((field) => values[field].trim().length > 0)
}

export function readSavedCheckout(
  storage: CheckoutStorage | null = browserStorage(),
): CheckoutFormValues | null {
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(CHECKOUT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    const source = parsed as Record<string, unknown>
    const values = { ...emptyCheckoutForm }

    for (const field of fieldNames) {
      values[field] = cleanValue(source[field])
    }

    return hasCheckoutData(values) ? values : null
  } catch {
    return null
  }
}

export function writeSavedCheckout(
  values: CheckoutFormValues,
  storage: CheckoutStorage | null = browserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    if (!hasCheckoutData(values)) {
      storage.removeItem(CHECKOUT_STORAGE_KEY)
      return
    }

    const saved: Record<string, string> = {}

    for (const field of fieldNames) {
      saved[field] = values[field]
    }

    storage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage may be unavailable in private or restricted contexts.
  }
}

export function clearSavedCheckout(
  storage: CheckoutStorage | null = browserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(CHECKOUT_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in private or restricted contexts.
  }
}
