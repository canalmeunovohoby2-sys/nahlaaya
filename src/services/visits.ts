import { backendMode, supabase } from './supabase/client'
import {
  getOrCreateVisitSession,
  hasVisitBeenRecorded,
  markVisitRecorded,
} from '../lib/visit-session'
import type { VisitSessionStorage } from '../lib/visit-session'

let registrationPromise: Promise<void> | null = null

function browserSessionStorage(): VisitSessionStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

async function registerVisit(): Promise<void> {
  if (backendMode !== 'supabase' || !supabase) {
    return
  }

  const storage = browserSessionStorage()

  if (!storage) {
    return
  }

  const sessionId = getOrCreateVisitSession(storage)

  if (!sessionId || hasVisitBeenRecorded(storage)) {
    return
  }

  try {
    const { error } = await supabase.functions.invoke('register-visit', {
      body: { sessionId },
    })

    if (!error) {
      markVisitRecorded(storage)
    }
  } catch {
    // Do not block the storefront. A later full page load can try again;
    // the database uniqueness constraint prevents duplicate sessions.
  }
}

export function registerVisitIfNeeded(): Promise<void> {
  if (!registrationPromise) {
    registrationPromise = registerVisit()
  }

  return registrationPromise
}
