alter table public.products
  add column if not exists weight_grams integer
    check (weight_grams is null or weight_grams > 0);

alter table public.products
  add column if not exists length_cm integer
    check (length_cm is null or length_cm > 0);

alter table public.products
  add column if not exists width_cm integer
    check (width_cm is null or width_cm > 0);

alter table public.products
  add column if not exists height_cm integer
    check (height_cm is null or height_cm > 0);

create table if not exists public.shipping_settings (
  id boolean primary key default true check (id = true),
  origin_cep text
    check (origin_cep is null or origin_cep ~ '^[0-9]{8}$'),
  updated_at timestamptz not null default now()
);

drop trigger if exists shipping_settings_touch_updated_at
  on public.shipping_settings;
create trigger shipping_settings_touch_updated_at
before update on public.shipping_settings
for each row execute function public.touch_updated_at();

alter table public.shipping_settings enable row level security;

revoke all on public.shipping_settings from public, anon, authenticated;
grant select, insert, update, delete on public.shipping_settings to service_role;

comment on table public.shipping_settings is
  'Configuração administrativa de origem para cálculo de frete. Sem acesso público.';
