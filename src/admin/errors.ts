export const ADMIN_UNAUTHORIZED_EVENT = 'nahla-aya:admin-unauthorized'

export class AdminApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

export function notifyAdminUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT))
  }
}
