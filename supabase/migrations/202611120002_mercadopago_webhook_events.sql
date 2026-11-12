create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  notification_id text not null,
  provider_notification_id text,
  payment_id text,
  order_id bigint references public.orders(id) on delete set null,
  event_type text,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'reconciliation_required', 'failed')),
  attempts integer not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, notification_id)
);

alter table public.payment_webhook_events
  add column if not exists provider_notification_id text;

alter table public.orders
  add column if not exists payment_reconciliation_status text
    check (
      payment_reconciliation_status is null
      or payment_reconciliation_status in (
        'refund_review',
        'chargeback_review',
        'refunded',
        'chargeback'
      )
    ),
  add column if not exists payment_reconciliation_updated_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_amount_cents bigint
    check (refunded_amount_cents is null or refunded_amount_cents >= 0),
  add column if not exists chargeback_at timestamptz;

drop function if exists public.claim_payment_webhook_event(text, text, text, text);

create or replace function public.claim_payment_webhook_event(
  p_provider text,
  p_notification_id text,
  p_provider_notification_id text,
  p_payment_id text,
  p_event_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.payment_webhook_events%rowtype;
begin
  insert into public.payment_webhook_events (
    provider, notification_id, provider_notification_id, payment_id, event_type, status, updated_at
  ) values (
    p_provider, p_notification_id, p_provider_notification_id, p_payment_id, p_event_type, 'processing', now()
  )
  on conflict (provider, notification_id) do update
  set
    attempts = public.payment_webhook_events.attempts + 1,
    provider_notification_id = excluded.provider_notification_id,
    payment_id = excluded.payment_id,
    event_type = excluded.event_type,
    status = 'processing',
    updated_at = now(),
    last_error = null
  where public.payment_webhook_events.status = 'failed'
     or (
       public.payment_webhook_events.status = 'processing'
       and public.payment_webhook_events.updated_at < now() - interval '10 minutes'
     )
  returning * into v_event;

  if found then
    return jsonb_build_object(
      'claimed', true,
      'event', to_jsonb(v_event)
    );
  end if;

  select * into v_event
  from public.payment_webhook_events
  where provider = p_provider
    and notification_id = p_notification_id;

  return jsonb_build_object(
    'claimed', false,
    'event', to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.claim_payment_webhook_event(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_payment_webhook_event(text, text, text, text, text)
  to service_role;

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from public;
revoke all on public.payment_webhook_events from anon, authenticated;
grant select, insert, update, delete on public.payment_webhook_events to service_role;
