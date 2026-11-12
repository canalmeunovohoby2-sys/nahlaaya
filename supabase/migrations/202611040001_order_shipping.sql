alter table public.orders
  add column if not exists shipping_provider text,
  add column if not exists shipping_service_id text,
  add column if not exists shipping_service_name text,
  add column if not exists shipping_origin_cep text,
  add column if not exists shipping_destination_cep text,
  add column if not exists shipping_estimated_days integer
    check (shipping_estimated_days is null or shipping_estimated_days >= 0),
  add column if not exists shipping_quote_snapshot jsonb,
  add column if not exists shipping_volumes jsonb;

comment on column public.orders.shipping_provider is
  'Transportadora usada na cotação aprovada pelo servidor.';
comment on column public.orders.shipping_service_id is
  'Identificador do serviço escolhido no Melhor Envio.';
comment on column public.orders.shipping_service_name is
  'Nome da modalidade de envio escolhida.';
comment on column public.orders.shipping_origin_cep is
  'CEP de origem usado na cotação aprovada.';
comment on column public.orders.shipping_destination_cep is
  'CEP de destino usado na cotação aprovada.';
comment on column public.orders.shipping_estimated_days is
  'Prazo estimado em dias úteis informado na cotação.';
comment on column public.orders.shipping_quote_snapshot is
  'Snapshot da cotação autoritativa calculada no servidor.';
comment on column public.orders.shipping_volumes is
  'Volumes enviados ao Melhor Envio na cotação.';

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
  v_total_cents bigint;
  v_items jsonb := '[]'::jsonb;
  v_updated integer;
  v_shipping jsonb := p_payload->'shipping';
  v_has_shipping boolean := false;
  v_shipping_provider text;
  v_shipping_service_id text;
  v_shipping_service_name text;
  v_shipping_origin_cep text;
  v_shipping_destination_cep text;
  v_shipping_estimated_days integer;
  v_shipping_total bigint := 0;
  v_shipping_snapshot jsonb;
  v_shipping_volumes jsonb;
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

  if v_shipping is not null then
    if jsonb_typeof(v_shipping) is distinct from 'object' then
      raise exception 'Cotação de frete inválida.' using errcode = '22023';
    end if;

    v_has_shipping := true;
    v_shipping_provider := nullif(btrim(v_shipping->>'provider'), '');
    v_shipping_service_id := nullif(btrim(v_shipping->>'serviceId'), '');
    v_shipping_service_name := nullif(btrim(v_shipping->>'serviceName'), '');
    v_shipping_origin_cep := nullif(btrim(v_shipping->>'originCep'), '');
    v_shipping_destination_cep := nullif(btrim(v_shipping->>'destinationCep'), '');
    v_shipping_snapshot := v_shipping->'snapshot';
    v_shipping_volumes := v_shipping->'volumes';

    if v_shipping_provider is null
       or v_shipping_provider <> 'melhor_envio'
       or v_shipping_service_id is null
       or v_shipping_service_name is null
       or v_shipping_origin_cep is null
       or v_shipping_origin_cep !~ '^[0-9]{8}$'
       or v_shipping_destination_cep is null
       or v_shipping_destination_cep !~ '^[0-9]{8}$' then
      raise exception 'Cotação de frete inválida.' using errcode = '22023';
    end if;

    if (v_shipping->>'priceCents') is null
       or (v_shipping->>'priceCents') !~ '^[0-9]+$' then
      raise exception 'Valor de frete inválido.' using errcode = '22023';
    end if;

    v_shipping_total := (v_shipping->>'priceCents')::bigint;

    if (v_shipping->>'estimatedDays') is null
       or (v_shipping->>'estimatedDays') !~ '^[0-9]+$' then
      raise exception 'Prazo de frete inválido.' using errcode = '22023';
    end if;

    v_shipping_estimated_days := (v_shipping->>'estimatedDays')::integer;

    if jsonb_typeof(v_shipping_volumes) is distinct from 'array'
       or jsonb_array_length(v_shipping_volumes) = 0 then
      raise exception 'Volumes de frete inválidos.' using errcode = '22023';
    end if;

    if jsonb_typeof(v_shipping_snapshot) is distinct from 'object' then
      raise exception 'Snapshot de frete inválido.' using errcode = '22023';
    end if;
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

  v_total_cents := v_selected_total + v_shipping_total;

  insert into public.orders (
    order_number, customer_id, address_id, payment_method,
    subtotal_pix_cents, subtotal_debit_cents, installment_total_cents,
    selected_total_cents, shipping_total_cents, total_cents,
    shipping_provider, shipping_service_id, shipping_service_name,
    shipping_origin_cep, shipping_destination_cep, shipping_estimated_days,
    shipping_quote_snapshot, shipping_volumes
  ) values (
    'PENDING-' || gen_random_uuid()::text,
    v_customer_id,
    v_address_id,
    v_payment_method,
    v_subtotal_pix,
    v_subtotal_debit,
    v_installment_total,
    v_selected_total,
    case when v_has_shipping then v_shipping_total else null end,
    v_total_cents,
    v_shipping_provider,
    v_shipping_service_id,
    v_shipping_service_name,
    v_shipping_origin_cep,
    v_shipping_destination_cep,
    v_shipping_estimated_days,
    v_shipping_snapshot,
    v_shipping_volumes
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
    'shippingTotalCents', case when v_has_shipping then v_shipping_total else null end,
    'totalCents', v_total_cents,
    'shipping', case
      when v_has_shipping then jsonb_build_object(
        'provider', v_shipping_provider,
        'serviceId', v_shipping_service_id,
        'serviceName', v_shipping_service_name,
        'originCep', v_shipping_origin_cep,
        'destinationCep', v_shipping_destination_cep,
        'priceCents', v_shipping_total,
        'estimatedDays', v_shipping_estimated_days
      )
      else null
    end,
    'createdAt', now()
  );
end;
$$;

revoke all on function public.create_order(jsonb) from public;
revoke all on function public.create_order(jsonb) from anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
