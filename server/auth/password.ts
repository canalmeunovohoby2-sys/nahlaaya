import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expectedHash] = stored.split('$')

  if (scheme !== 'scrypt' || !salt || !expectedHash) {
    return false
  }

  const expected = Buffer.from(expectedHash, 'hex')
  const actual = scryptSync(password, salt, KEY_LENGTH)

  if (expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(expected, actual)
}
