create table if not exists public.mercadopago_settings (
  id boolean primary key default true check (id),
  public_key text,
  access_token_ciphertext text,
  access_token_iv text,
  access_token_tag text,
  webhook_secret_ciphertext text,
  webhook_secret_iv text,
  webhook_secret_tag text,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'error')),
  validation_message text,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mercadopago_settings is
  'Credenciais do Mercado Pago acessiveis somente pelo backend privilegiado.';
comment on column public.mercadopago_settings.access_token_ciphertext is
  'Access Token criptografado com AES-256-GCM.';
comment on column public.mercadopago_settings.webhook_secret_ciphertext is
  'Segredo do webhook criptografado com AES-256-GCM.';

alter table public.mercadopago_settings enable row level security;

revoke all on public.mercadopago_settings from public;
revoke all on public.mercadopago_settings from anon, authenticated;
grant select, insert, update, delete on public.mercadopago_settings to service_role;
