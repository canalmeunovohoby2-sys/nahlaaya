import { createHash, randomBytes } from 'node:crypto'
import type { Response } from 'express'
import { db } from '../db'

export const SESSION_COOKIE = 'nahla_admin_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

export interface AdminUser {
  id: number
  name: string
  email: string
}

export interface AdminSession {
  id: string
  admin: AdminUser
  csrfToken: string
  expiresAt: string
}

interface SessionRow {
  id: string
  admin_id: number
  csrf_token: string
  expires_at: string
  name: string
  email: string
}

const insertSession = db.prepare(`
  INSERT INTO admin_sessions (id, admin_id, csrf_token, expires_at)
  VALUES (?, ?, ?, ?)
`)

const selectSession = db.prepare(`
  SELECT s.id, s.admin_id, s.csrf_token, s.expires_at, u.name, u.email
  FROM admin_sessions s
  JOIN admin_users u ON u.id = s.admin_id
  WHERE s.id = ?
`)

const deleteSessionById = db.prepare('DELETE FROM admin_sessions WHERE id = ?')
const deleteExpiredSessions = db.prepare(
  "DELETE FROM admin_sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
)

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(admin: AdminUser): {
  token: string
  csrfToken: string
  expiresAt: string
} {
  const token = randomBytes(32).toString('hex')
  const csrfToken = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

  deleteExpiredSessions.run()
  insertSession.run(hashToken(token), admin.id, csrfToken, expiresAt)

  return { token, csrfToken, expiresAt }
}

export function getSession(token: string | undefined): AdminSession | null {
  if (!token) {
    return null
  }

  const row = selectSession.get(hashToken(token)) as SessionRow | undefined

  if (!row) {
    return null
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    deleteSessionById.run(row.id)
    return null
  }

  return {
    id: row.id,
    admin: {
      id: row.admin_id,
      name: row.name,
      email: row.email,
    },
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
  }
}

export function deleteSession(sessionId: string): void {
  deleteSessionById.run(sessionId)
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`,
  )
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`,
  )
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf('=')

    if (separator === -1) {
      return cookies
    }

    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    cookies[key] = decodeURIComponent(value)
    return cookies
  }, {})
}
