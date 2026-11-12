import { HttpError } from './http.ts'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function clientKey(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

async function hashKey(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function enforceRateLimit(
  request: Request,
  limit = 30,
  windowMs = 10 * 60 * 1000,
): Promise<void> {
  const key = await hashKey(clientKey(request))
  const now = Date.now()
  const current = buckets.get(key)

  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey)
      }
    }
  }

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= limit) {
    throw new HttpError(429, 'Muitas tentativas. Tente novamente mais tarde.')
  }

  current.count += 1
}

export function enforceVisitRateLimit(
  request: Request,
  limit = 30,
  windowMs = 10 * 60 * 1000,
): Promise<void> {
  return enforceRateLimit(request, limit, windowMs)
}
