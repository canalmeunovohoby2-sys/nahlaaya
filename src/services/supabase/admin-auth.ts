import { supabase } from './client'

export async function signInSupabaseAdmin(
  email: string,
  password: string,
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase Auth não configurado.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  const token = data.session?.access_token

  if (!token) {
    throw new Error('Sessão administrativa indisponível.')
  }

  return token
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function signOutSupabaseAdmin(): Promise<void> {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}
