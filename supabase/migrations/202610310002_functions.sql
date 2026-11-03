create or replace function public.release_expired_order_reservations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_count integer := 0;
begin
  for v_order in
    select *
    from public.orders
    where payment_status = 'pending'
      and stock_reserved_at is not null
      and stock_released_at is null
      and reservation_expires_at is not null
      and reservation_expires_at <= now()
    for update skip locked
  loop
    update public.orders
    set
      payment_status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now())
    where id = v_order.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.release_expired_order_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_order_reservations() to service_role;

create or replace function public.get_expired_order_reservations()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'orderNumber', o.order_number,
        'createdAt', o.created_at,
        'reservationExpiresAt', o.reservation_expires_at,
        'totalCents', o.total_cents,
        'itemCount', (
          select count(*)
          from public.order_items oi
          where oi.order_id = o.id
        )
      )
      order by o.reservation_expires_at
    ),
    '[]'::jsonb
  )
  from public.orders o
  where o.payment_status = 'pending'
    and o.stock_reserved_at is not null
    and o.stock_released_at is null
    and o.reservation_expires_at is not null
    and o.reservation_expires_at <= now();
$$;

revoke all on function public.get_expired_order_reservations() from public, anon, authenticated;
grant execute on function public.get_expired_order_reservations() to service_role;

create or replace function public.mark_order_payment_failed(
  p_order_id bigint,
  p_terminal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'Pedido pago não pode ser marcado como falho.'
      using errcode = 'P0001';
  end if;

  if v_order.payment_status = 'cancelled' then
    raise exception 'Pedido cancelado não pode ser marcado como falho.'
      using errcode = 'P0001';
  end if;

  if v_order.payment_status = 'failed' then
    return to_jsonb(v_order);
  end if;

  if not p_terminal then
    return to_jsonb(v_order);
  end if;

  update public.orders
  set
    payment_status = 'failed',
    payment_failure_terminal = true
  where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.mark_order_payment_failed(bigint, boolean) from public, anon, authenticated;
grant execute on function public.mark_order_payment_failed(bigint, boolean) to service_role;

create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment_method text := p_payload->>'paymentMethod';
  v_item jsonb;
  v_product public.products%rowtype;
  v_customer_id bigint;
  v_address_id bigint;
  v_order_id bigint;
  v_order_number text;
  v_quantity integer;
  v_unit_pix bigint;
  v_unit_debit bigint;
  v_unit_installment bigint;
  v_subtotal_pix bigint := 0;
  v_subtotal_debit bigint := 0;
  v_installment_total bigint := 0;
  v_selected_total bigint;
  v_items jsonb := '[]'::jsonb;
  v_updated integer;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Payload do pedido inválido.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload->'buyer') is distinct from 'object' then
    raise exception 'Dados do comprador inválidos.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload->'address') is distinct from 'object' then
    raise exception 'Endereço de entrega inválido.' using errcode = '22023';
  end if;

  if not (p_payload ? 'items') then
    raise exception 'A sacola está vazia.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload->'items') is distinct from 'array' then
    raise exception 'Itens do pedido inválidos.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'A sacola está vazia.' using errcode = '22023';
  end if;

  if v_payment_method is null
     or v_payment_method not in ('pix', 'debit', 'credit') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;

  if nullif(btrim(p_payload->'buyer'->>'fullName'), '') is null
     or nullif(btrim(p_payload->'buyer'->>'cpf'), '') is null
     or nullif(btrim(p_payload->'buyer'->>'email'), '') is null
     or nullif(btrim(p_payload->'buyer'->>'phone'), '') is null then
    raise exception 'Dados do comprador inválidos.' using errcode = '22023';
  end if;

  if nullif(btrim(p_payload->'address'->>'cep'), '') is null
     or nullif(btrim(p_payload->'address'->>'street'), '') is null
     or nullif(btrim(p_payload->'address'->>'number'), '') is null
     or nullif(btrim(p_payload->'address'->>'neighborhood'), '') is null
     or nullif(btrim(p_payload->'address'->>'city'), '') is null
     or nullif(btrim(p_payload->'address'->>'state'), '') is null then
    raise exception 'Endereço de entrega inválido.' using errcode = '22023';
  end if;

  select id into v_customer_id
  from public.customers
  where email = lower(btrim(p_payload->'buyer'->>'email'));

  if v_customer_id is null then
    select id into v_customer_id
    from public.customers
    where cpf = btrim(p_payload->'buyer'->>'cpf');
  end if;

  if v_customer_id is null then
    insert into public.customers (full_name, cpf, email, phone)
    values (
      btrim(p_payload->'buyer'->>'fullName'),
      btrim(p_payload->'buyer'->>'cpf'),
      lower(btrim(p_payload->'buyer'->>'email')),
      btrim(p_payload->'buyer'->>'phone')
    )
    returning id into v_customer_id;
  else
    update public.customers
    set
      full_name = btrim(p_payload->'buyer'->>'fullName'),
      email = lower(btrim(p_payload->'buyer'->>'email')),
      phone = btrim(p_payload->'buyer'->>'phone')
    where id = v_customer_id;
  end if;

  insert into public.addresses (
    customer_id, cep, street, number, complement, neighborhood, city, state
  ) values (
    v_customer_id,
    btrim(p_payload->'address'->>'cep'),
    btrim(p_payload->'address'->>'street'),
    btrim(p_payload->'address'->>'number'),
    coalesce(btrim(p_payload->'address'->>'complement'), ''),
    btrim(p_payload->'address'->>'neighborhood'),
    btrim(p_payload->'address'->>'city'),
    btrim(p_payload->'address'->>'state')
  )
  returning id into v_address_id;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Item do pedido inválido.' using errcode = '22023';
    end if;

    if nullif(btrim(v_item->>'productId'), '') is null then
      raise exception 'Produto do item não informado.' using errcode = '22023';
    end if;

    if (v_item->>'quantity') is null
       or (v_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity <= 0 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = btrim(v_item->>'productId') and active = true;

    if not found then
      raise exception 'Produto indisponível.' using errcode = 'P0002';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'Estoque insuficiente para %.', v_product.name using errcode = 'P0001';
    end if;

    v_unit_pix := round(v_product.installment_total_cents * 0.9)::bigint;
    v_unit_debit := v_product.debit_price_cents;
    v_unit_installment := v_product.installment_total_cents;

    v_subtotal_pix := v_subtotal_pix + (v_unit_pix * v_quantity);
    v_subtotal_debit := v_subtotal_debit + (v_unit_debit * v_quantity);
    v_installment_total := v_installment_total + (v_unit_installment * v_quantity);

    v_items := v_items || jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'brand', v_product.brand,
      'quantity', v_quantity,
      'unitPix', v_unit_pix,
      'unitDebit', v_unit_debit,
      'unitInstallment', v_unit_installment,
      'linePix', v_unit_pix * v_quantity,
      'lineDebit', v_unit_debit * v_quantity,
      'lineInstallment', v_unit_installment * v_quantity
    );
  end loop;

  v_selected_total := case v_payment_method
    when 'debit' then v_subtotal_debit
    when 'credit' then v_installment_total
    else v_subtotal_pix
  end;

  insert into public.orders (
    order_number, customer_id, address_id, payment_method,
    subtotal_pix_cents, subtotal_debit_cents, installment_total_cents,
    selected_total_cents, shipping_total_cents, total_cents
  ) values (
    'PENDING-' || gen_random_uuid()::text,
    v_customer_id,
    v_address_id,
    v_payment_method,
    v_subtotal_pix,
    v_subtotal_debit,
    v_installment_total,
    v_selected_total,
    null,
    v_selected_total
  )
  returning id into v_order_id;

  v_order_number := 'NA-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_order_id::text, 6, '0');

  update public.orders
  set order_number = v_order_number
  where id = v_order_id;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, brand, quantity,
      unit_pix_cents, unit_debit_cents, unit_installment_cents,
      line_pix_cents, line_debit_cents, line_installment_cents
    ) values (
      v_order_id,
      v_item->>'productId',
      v_item->>'name',
      v_item->>'brand',
      (v_item->>'quantity')::integer,
      (v_item->>'unitPix')::bigint,
      (v_item->>'unitDebit')::bigint,
      (v_item->>'unitInstallment')::bigint,
      (v_item->>'linePix')::bigint,
      (v_item->>'lineDebit')::bigint,
      (v_item->>'lineInstallment')::bigint
    );
  end loop;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    update public.products
    set stock = stock - (v_item->>'quantity')::integer
    where id = v_item->>'productId'
      and active = true
      and stock >= (v_item->>'quantity')::integer;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      raise exception 'Estoque insuficiente para %.', v_item->>'name'
        using errcode = 'P0001';
    end if;
  end loop;

  update public.orders
  set
    stock_reserved_at = now(),
    reservation_expires_at = now() + interval '30 minutes'
  where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'orderNumber', v_order_number,
    'paymentMethod', v_payment_method,
    'paymentStatus', 'pending',
    'deliveryStatus', 'pending',
    'subtotalPixCents', v_subtotal_pix,
    'subtotalDebitCents', v_subtotal_debit,
    'installmentTotalCents', v_installment_total,
    'selectedTotalCents', v_selected_total,
    'shippingTotalCents', null,
    'totalCents', v_selected_total,
    'createdAt', now()
  );
end;
$$;

revoke all on function public.create_order(jsonb) from public;
revoke all on function public.create_order(jsonb) from anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

create or replace function public.confirm_order_payment(
  p_order_id bigint,
  p_provider text default null,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_event public.order_payment_events%rowtype;
  v_provider text;
  v_reference text;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if v_order.payment_status = 'paid' then
    return to_jsonb(v_order);
  end if;

  if v_order.payment_status in ('cancelled', 'failed') then
    raise exception 'Pedido cancelado ou com pagamento falho não pode ser pago.'
      using errcode = 'P0001';
  end if;

  if v_order.stock_reserved_at is null or v_order.stock_released_at is not null then
    raise exception 'Pedido sem reserva de estoque ativa.' using errcode = 'P0001';
  end if;

  if v_order.reservation_expires_at is null then
    raise exception 'Reserva de estoque sem prazo definido.' using errcode = 'P0001';
  end if;

  if v_order.reservation_expires_at <= now() then
    update public.orders
    set
      payment_status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now())
    where id = p_order_id
    returning * into v_order;

    return to_jsonb(v_order) || jsonb_build_object('reservationExpired', true);
  end if;

  v_provider := coalesce(nullif(btrim(p_provider), ''), 'manual');
  v_reference := nullif(btrim(p_reference), '');

  if v_reference is null then
    raise exception 'Referência de pagamento obrigatória.' using errcode = '22023';
  end if;

  select * into v_event
  from public.order_payment_events
  where provider_event_id = v_reference
  for update;

  if found then
    if v_event.order_id <> p_order_id then
      raise exception 'Referência de pagamento já vinculada a outro pedido.'
        using errcode = 'P0001';
    end if;
  else
    begin
      insert into public.order_payment_events (
        order_id, provider, provider_event_id, status, amount_cents
      ) values (
        p_order_id,
        v_provider,
        v_reference,
        'paid',
        v_order.total_cents
      );
    exception when unique_violation then
      raise exception 'Referência de pagamento já utilizada.'
        using errcode = 'P0001';
    end;
  end if;

  update public.orders
  set
    payment_status = 'paid',
    paid_at = coalesce(paid_at, now()),
    payment_provider = coalesce(payment_provider, v_provider),
    payment_reference = coalesce(payment_reference, v_reference),
    stock_deducted_at = coalesce(stock_deducted_at, now())
  where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.confirm_order_payment(bigint, text, text) from public;
revoke all on function public.confirm_order_payment(bigint, text, text) from anon, authenticated;
grant execute on function public.confirm_order_payment(bigint, text, text) to service_role;
