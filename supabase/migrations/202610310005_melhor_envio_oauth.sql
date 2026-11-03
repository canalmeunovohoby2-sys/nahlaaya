create table if not exists public.integration_connections (
  provider text primary key check (provider = 'melhor_envio'),
  account_id text,
  account_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz not null,
  scope text,
  needs_reconnect boolean not null default false,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_oauth_states (
  state_hash text primary key,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists integration_oauth_states_expiry_idx
  on public.integration_oauth_states (expires_at);

drop trigger if exists integration_connections_touch_updated_at
  on public.integration_connections;
create trigger integration_connections_touch_updated_at
before update on public.integration_connections
for each row execute function public.touch_updated_at();

alter table public.integration_connections enable row level security;
alter table public.integration_oauth_states enable row level security;

revoke all on public.integration_connections from public, anon, authenticated;
revoke all on public.integration_oauth_states from public, anon, authenticated;

grant select, insert, update, delete on public.integration_connections to service_role;
grant select, insert, update, delete on public.integration_oauth_states to service_role;

comment on table public.integration_connections is
  'Credenciais OAuth criptografadas de integrações externas. Sem acesso público.';
comment on table public.integration_oauth_states is
  'Estados OAuth temporários de uso único, armazenados somente como hash.';
