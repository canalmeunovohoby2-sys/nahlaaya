import { Router } from 'express'
import { db } from '../db'
import { hashPassword, verifyPassword } from './password'
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSession,
  parseCookies,
  SESSION_COOKIE,
  setSessionCookie,
} from './sessions'
import type { AdminUser } from './sessions'
import { requireAdmin, requireCsrf } from './middleware'

interface AdminRow {
  id: number
  name: string
  email: string
  password_hash: string
}

const selectAdminByEmail = db.prepare(
  'SELECT id, name, email, password_hash FROM admin_users WHERE email = ?',
)

export function ensureAdminFromEnvironment(): void {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    return
  }

  const existing = selectAdminByEmail.get(email) as AdminRow | undefined

  if (existing) {
    return
  }

  if (password.length < 10) {
    console.warn('ADMIN_PASSWORD deve ter pelo menos 10 caracteres.')
    return
  }

  const name = process.env.ADMIN_NAME?.trim() || 'Administrador'
  db.prepare(
    'INSERT INTO admin_users (name, email, password_hash) VALUES (?, ?, ?)',
  ).run(name, email, hashPassword(password))
  console.log(`Administrador inicial criado para ${email}.`)
}

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : ''
  const password =
    typeof req.body?.password === 'string' ? req.body.password : ''

  if (!email || !password) {
    res.status(400).json({ message: 'Informe e-mail e senha.' })
    return
  }

  const admin = selectAdminByEmail.get(email) as AdminRow | undefined

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({ message: 'Credenciais inválidas.' })
    return
  }

  const user: AdminUser = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
  }
  const session = createSession(user)

  setSessionCookie(res, session.token)
  res.json({
    admin: user,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
  })
})

authRouter.get('/session', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const cookies = parseCookies(req.headers.cookie)
  const session = getSession(cookies[SESSION_COOKIE])

  if (!session) {
    res.json({ admin: null, csrfToken: null, expiresAt: null })
    return
  }

  res.json({
    admin: session.admin,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
  })
})

authRouter.post('/logout', requireAdmin, requireCsrf, (req, res) => {
  const session = req.adminSession

  if (session) {
    deleteSession(session.id)
  }

  clearSessionCookie(res)
  res.json({ ok: true })
})
