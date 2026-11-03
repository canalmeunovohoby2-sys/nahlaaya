import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const backendMode: 'local' | 'supabase' =
  import.meta.env.VITE_BACKEND_MODE === 'supabase' && isSupabaseConfigured
    ? 'supabase'
    : 'local'

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null

export async function invokeEdgeFunction<T>(
  name: string,
  body: unknown,
): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase não configurado neste ambiente.')
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  })

  if (error) {
    throw new Error(error.message || 'Falha ao chamar a função do Supabase.')
  }

  return data as T
}
