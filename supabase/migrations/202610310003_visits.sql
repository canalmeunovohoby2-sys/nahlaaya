create table if not exists public.visits (
  id bigint generated always as identity primary key,
  session_id uuid not null unique,
  visited_at timestamptz not null default now(),
  visit_date date generated always as (
    (visited_at at time zone 'America/Sao_Paulo')::date
  ) stored
);

comment on table public.visits is
  'Visitas únicas por sessão de navegação. Não armazena IP, nome, telefone, CPF ou endereço.';
comment on column public.visits.session_id is
  'Identificador temporário gerado no navegador; não identifica uma pessoa.';
comment on column public.visits.visit_date is
  'Data local de Brasília usada para agrupamento diário.';

create index if not exists visits_visit_date_idx
  on public.visits (visit_date);

create index if not exists visits_visited_at_idx
  on public.visits (visited_at desc);

alter table public.visits enable row level security;

revoke all on table public.visits from public, anon, authenticated;
revoke all on sequence public.visits_id_seq from public, anon, authenticated;

grant select, insert, update, delete on table public.visits to service_role;
grant usage, select on sequence public.visits_id_seq to service_role;

create or replace function public.register_visit(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visit public.visits%rowtype;
begin
  if p_session_id is null then
    raise exception 'Sessão inválida.' using errcode = '22023';
  end if;

  insert into public.visits (session_id)
  values (p_session_id)
  on conflict (session_id) do nothing
  returning * into v_visit;

  if v_visit.id is null then
    return jsonb_build_object('recorded', false);
  end if;

  return jsonb_build_object(
    'recorded', true,
    'visitedAt', v_visit.visited_at,
    'visitDate', v_visit.visit_date
  );
end;
$$;

revoke all on function public.register_visit(uuid) from public, anon, authenticated;
grant execute on function public.register_visit(uuid) to service_role;

create or replace function public.get_visit_stats()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with bounds as (
    select (now() at time zone 'America/Sao_Paulo')::date as today
  )
  select jsonb_build_object(
    'total', (
      select count(*) from public.visits
    ),
    'today', (
      select count(*)
      from public.visits v, bounds b
      where v.visit_date = b.today
    ),
    'last7Days', (
      select count(*)
      from public.visits v, bounds b
      where v.visit_date between b.today - 6 and b.today
    ),
    'timezone', 'America/Sao_Paulo'
  );
$$;

revoke all on function public.get_visit_stats() from public, anon, authenticated;
grant execute on function public.get_visit_stats() to service_role;
