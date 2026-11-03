import { createClient } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'

export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceRoleKey) {
    throw new HttpError(500, 'Configuração do Supabase indisponível.')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Autenticação administrativa obrigatória.')
  }

  const client = getServiceClient()
  const token = authorization.slice('Bearer '.length)
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw new HttpError(401, 'Sessão administrativa inválida.')
  }

  const { data: profile, error: profileError } = await client
    .from('admin_profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    throw new HttpError(403, 'Usuário sem permissão administrativa.')
  }

  return data.user
}
