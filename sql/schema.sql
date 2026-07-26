-- sql/schema.sql
-- Chạy trong Supabase SQL Editor. Bản demo cho web tĩnh, cần thay RLS policy khi dùng thật.
/*
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  product_code text,
  sku text,
  barcode text,
  brand text,
  unit text,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text,
  size text,
  color text,
  attributes jsonb not null default '{}'::jsonb,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14, 2) not null default 0 check (sale_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text default 'Khách lẻ',
  customer_phone text,
  customer_address text,
  status text not null default 'completed' check (status in ('completed', 'cancelled', 'returned')),
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  gross_profit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  category_name text,
  variant_label text,
  quantity integer not null check (quantity > 0),
  sale_price numeric(14, 2) not null default 0,
  cost_price numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  line_cost numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text,
  entity_id uuid,
  code text,
  description text,
  amount numeric(14, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists product_code text;
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists unit text;
alter table public.product_variants add column if not exists variant_name text;
alter table public.product_variants add column if not exists attributes jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists customer_address text;
alter table public.order_items add column if not exists category_name text;

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_product_code on public.products(product_code);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_attributes on public.product_variants using gin(attributes);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at);
create index if not exists idx_activity_logs_action on public.activity_logs(action);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "demo_categories_all" on public.categories;
create policy "demo_categories_all" on public.categories for all to anon using (true) with check (true);

drop policy if exists "demo_products_all" on public.products;
create policy "demo_products_all" on public.products for all to anon using (true) with check (true);

drop policy if exists "demo_product_variants_all" on public.product_variants;
create policy "demo_product_variants_all" on public.product_variants for all to anon using (true) with check (true);

drop policy if exists "demo_orders_all" on public.orders;
create policy "demo_orders_all" on public.orders for all to anon using (true) with check (true);

drop policy if exists "demo_order_items_all" on public.order_items;
create policy "demo_order_items_all" on public.order_items for all to anon using (true) with check (true);

drop policy if exists "demo_activity_logs_all" on public.activity_logs;
create policy "demo_activity_logs_all" on public.activity_logs for all to anon using (true) with check (true);

drop policy if exists "demo_storage_product_images_select" on storage.objects;
create policy "demo_storage_product_images_select" on storage.objects for select to anon using (bucket_id = 'product-images');

drop policy if exists "demo_storage_product_images_insert" on storage.objects;
create policy "demo_storage_product_images_insert" on storage.objects for insert to anon with check (bucket_id = 'product-images');

drop policy if exists "demo_storage_product_images_update" on storage.objects;
create policy "demo_storage_product_images_update" on storage.objects for update to anon using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

drop policy if exists "demo_storage_product_images_delete" on storage.objects;
create policy "demo_storage_product_images_delete" on storage.objects for delete to anon using (bucket_id = 'product-images');



create or replace function public.variant_label_from_parts(v_name text, v_size text, v_color text, v_attributes jsonb)
returns text
language plpgsql
immutable
as $$
declare
  label text;
  attr_text text;
begin
  if coalesce(v_name, '') <> '' then
    return v_name;
  end if;

  select string_agg(key || ': ' || value, ' · ')
  into attr_text
  from jsonb_each_text(coalesce(v_attributes, '{}'::jsonb));

  label := concat_ws(' / ', nullif(v_size, ''), nullif(v_color, ''), nullif(attr_text, ''));
  return coalesce(nullif(label, ''), 'Mặc định');
end;
$$;

create or replace function public.create_order_with_stock(order_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  new_order_code text;
  new_created_at timestamptz;
  item jsonb;
  current_stock integer;
  variant_record record;
  activity_action text;
begin
  if order_payload is null then
    raise exception 'Thiếu dữ liệu đơn hàng.';
  end if;

  if jsonb_array_length(order_payload->'items') = 0 then
    raise exception 'Đơn hàng không có sản phẩm.';
  end if;

  for item in select * from jsonb_array_elements(order_payload->'items')
  loop
    select id, stock_qty
    into variant_record
    from public.product_variants
    where id = (item->>'variant_id')::uuid
    for update;

    if not found then
      raise exception 'Không tìm thấy biến thể sản phẩm: %', item->>'variant_id';
    end if;

    current_stock := coalesce(variant_record.stock_qty, 0);
    if current_stock < (item->>'quantity')::integer then
      raise exception 'Không đủ tồn kho cho sản phẩm: %', item->>'product_name';
    end if;
  end loop;

  new_order_code := coalesce(nullif(order_payload->>'code', ''), 'HD' || to_char(now(), 'YYYYMMDDHH24MISS') || floor(random() * 1000)::text);
  new_created_at := coalesce(nullif(order_payload->>'created_at', '')::timestamptz, now());

  insert into public.orders (
    code,
    customer_name,
    customer_phone,
    customer_address,
    status,
    subtotal,
    discount,
    total,
    total_cost,
    gross_profit,
    created_at
  )
  values (
    new_order_code,
    coalesce(order_payload->>'customer_name', 'Khách lẻ'),
    coalesce(order_payload->>'customer_phone', ''),
    coalesce(order_payload->>'customer_address', ''),
    'completed',
    coalesce((order_payload->>'subtotal')::numeric, 0),
    coalesce((order_payload->>'discount')::numeric, 0),
    coalesce((order_payload->>'total')::numeric, 0),
    coalesce((order_payload->>'total_cost')::numeric, 0),
    coalesce((order_payload->>'gross_profit')::numeric, 0),
    new_created_at
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(order_payload->'items')
  loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      category_name,
      variant_label,
      quantity,
      sale_price,
      cost_price,
      line_total,
      line_cost,
      created_at
    )
    values (
      new_order_id,
      (item->>'product_id')::uuid,
      (item->>'variant_id')::uuid,
      item->>'product_name',
      coalesce(item->>'category_name', ''),
      coalesce(item->>'variant_label', ''),
      (item->>'quantity')::integer,
      coalesce((item->>'sale_price')::numeric, 0),
      coalesce((item->>'cost_price')::numeric, 0),
      coalesce((item->>'line_total')::numeric, 0),
      coalesce((item->>'line_cost')::numeric, 0),
      new_created_at
    );

    update public.product_variants
    set stock_qty = stock_qty - (item->>'quantity')::integer
    where id = (item->>'variant_id')::uuid;
  end loop;

  activity_action := case when coalesce(order_payload->>'import_source', 'pos') = 'excel' then 'order_imported' else 'order_created' end;
  insert into public.activity_logs (action, entity_type, entity_id, code, description, amount, metadata, created_at)
  values (
    activity_action,
    'order',
    new_order_id,
    new_order_code,
    case when activity_action = 'order_imported' then 'Import đơn hàng từ Excel: ' || new_order_code else 'Tạo đơn bán hàng: ' || new_order_code end,
    coalesce((order_payload->>'total')::numeric, 0),
    order_payload,
    new_created_at
  );

  return jsonb_build_object(
    'id', new_order_id,
    'code', new_order_code,
    'status', 'completed',
    'subtotal', order_payload->>'subtotal',
    'discount', order_payload->>'discount',
    'total', order_payload->>'total',
    'customer_name', order_payload->>'customer_name',
    'customer_phone', order_payload->>'customer_phone',
    'customer_address', order_payload->>'customer_address'
  );
end;
$$;

create or replace function public.restore_order_stock(order_id_input uuid, next_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record record;
  item record;
  activity_action text;
begin
  if next_status not in ('cancelled', 'returned') then
    raise exception 'Trạng thái không hợp lệ.';
  end if;

  select * into order_record from public.orders where id = order_id_input for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;

  if order_record.status in ('cancelled', 'returned') then
    raise exception 'Đơn hàng đã hoàn kho trước đó.';
  end if;

  for item in select * from public.order_items where order_id = order_id_input
  loop
    update public.product_variants set stock_qty = stock_qty + item.quantity where id = item.variant_id;
  end loop;

  update public.orders set status = next_status where id = order_id_input;

  activity_action := case when next_status = 'cancelled' then 'order_cancelled' else 'order_returned' end;
  insert into public.activity_logs (action, entity_type, entity_id, code, description, amount, metadata)
  values (
    activity_action,
    'order',
    order_id_input,
    order_record.code,
    case when next_status = 'cancelled' then 'Hủy đơn và hoàn tồn kho: ' || order_record.code else 'Trả hàng và hoàn tồn kho: ' || order_record.code end,
    order_record.total,
    jsonb_build_object('previous_status', order_record.status, 'next_status', next_status, 'items', (select coalesce(jsonb_agg(jsonb_build_object('product_name', product_name, 'category_name', category_name, 'variant_label', variant_label, 'quantity', quantity, 'sale_price', sale_price, 'cost_price', cost_price, 'line_total', line_total, 'line_cost', line_cost)), '[]'::jsonb) from public.order_items where order_id = order_id_input))
  );

  return jsonb_build_object('id', order_id_input, 'status', next_status);
end;
$$;

create or replace function public.cancel_order_and_restore_stock(order_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.restore_order_stock(order_id_input, 'cancelled');
end;
$$;

create or replace function public.return_order_and_restore_stock(order_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.restore_order_stock(order_id_input, 'returned');
end;
$$;

grant execute on function public.variant_label_from_parts(text, text, text, jsonb) to anon;
grant execute on function public.create_order_with_stock(jsonb) to anon;
grant execute on function public.restore_order_stock(uuid, text) to anon;
grant execute on function public.cancel_order_and_restore_stock(uuid) to anon;
grant execute on function public.return_order_and_restore_stock(uuid) to anon;

-- V5 cleanup: product_type was removed from the UI because category now owns classification.
alter table public.products drop column if exists product_type;
