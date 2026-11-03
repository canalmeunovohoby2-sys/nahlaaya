export const VISIT_SESSION_STORAGE_KEY = 'nahla-aya.visit-session.v1'
export const VISIT_RECORDED_STORAGE_KEY = 'nahla-aya.visit-recorded.v1'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface VisitSessionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export function createVisitSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    const digit = char === 'x' ? value : (value & 0x3) | 0x8
    return digit.toString(16)
  })
}

export function getOrCreateVisitSession(
  storage: VisitSessionStorage | null,
): string | null {
  if (!storage) {
    return null
  }

  try {
    const existing = storage.getItem(VISIT_SESSION_STORAGE_KEY)

    if (existing && uuidPattern.test(existing)) {
      return existing
    }

    const created = createVisitSessionId()
    storage.setItem(VISIT_SESSION_STORAGE_KEY, created)
    storage.removeItem?.(VISIT_RECORDED_STORAGE_KEY)
    return created
  } catch {
    return null
  }
}

export function hasVisitBeenRecorded(
  storage: VisitSessionStorage | null,
): boolean {
  if (!storage) {
    return false
  }

  try {
    return storage.getItem(VISIT_RECORDED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markVisitRecorded(storage: VisitSessionStorage | null): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(VISIT_RECORDED_STORAGE_KEY, '1')
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
}
