import type { AdminSession } from '../auth/sessions'

declare global {
  namespace Express {
    interface Request {
      adminSession?: AdminSession
    }
  }
}

export {}
