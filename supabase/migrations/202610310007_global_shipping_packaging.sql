alter table public.shipping_settings
  add column if not exists perfume_weight_grams integer
    check (perfume_weight_grams is null or perfume_weight_grams > 0);

alter table public.shipping_settings
  add column if not exists box_weight_grams integer
    check (box_weight_grams is null or box_weight_grams > 0);

alter table public.shipping_settings
  add column if not exists box_length_cm integer
    check (box_length_cm is null or box_length_cm > 0);

alter table public.shipping_settings
  add column if not exists box_width_cm integer
    check (box_width_cm is null or box_width_cm > 0);

alter table public.shipping_settings
  add column if not exists box_height_cm integer
    check (box_height_cm is null or box_height_cm > 0);

alter table public.shipping_settings
  add column if not exists max_perfumes_per_box integer
    check (max_perfumes_per_box is null or max_perfumes_per_box > 0);

comment on column public.shipping_settings.perfume_weight_grams is
  'Peso de um perfume já embalado individualmente, em gramas.';
comment on column public.shipping_settings.box_weight_grams is
  'Peso adicional da caixa externa de envio, em gramas.';
comment on column public.shipping_settings.box_length_cm is
  'Comprimento externo da caixa, em centímetros.';
comment on column public.shipping_settings.box_width_cm is
  'Largura externa da caixa, em centímetros.';
comment on column public.shipping_settings.box_height_cm is
  'Altura externa da caixa, em centímetros.';
comment on column public.shipping_settings.max_perfumes_per_box is
  'Quantidade máxima de perfumes por caixa padrão.';
