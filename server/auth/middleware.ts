import type { NextFunction, Request, Response } from 'express'
import { getSession, parseCookies, SESSION_COOKIE } from './sessions'

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const cookies = parseCookies(req.headers.cookie)
  const session = getSession(cookies[SESSION_COOKIE])

  if (!session) {
    res.status(401).json({ message: 'Sessão administrativa inválida ou expirada.' })
    return
  }

  req.adminSession = session
  next()
}

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }

  const session = req.adminSession
  const providedToken = req.header('x-csrf-token')

  if (!session || !providedToken || providedToken !== session.csrfToken) {
    res.status(403).json({ message: 'Token de segurança inválido.' })
    return
  }

  next()
}
