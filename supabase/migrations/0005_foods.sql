-- 0005_foods.sql
-- The user's food library: manual foods, scanned products, OCR/AI results.
-- `nutrients` is a denormalized per-serving cache kept in sync by a trigger
-- (see 0006). `food_nutrients` is the source of truth.

create table if not exists public.foods (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  barcode                text,
  source                 text not null default 'manual', -- manual | off | usda | ocr | ai
  source_ref             text,
  brand                  text,
  name                   text not null,
  name_th                text,
  serving_size           numeric not null default 100,
  serving_unit           text not null default 'g',
  servings_per_container numeric,
  nutrients              jsonb not null default '{}'::jsonb, -- {key: amount_per_serving}
  confidence             numeric,
  verified               boolean not null default false,
  raw_payload            jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One row per product per user (re-scan hits this cache).
create unique index if not exists foods_user_barcode_uniq
  on public.foods (user_id, barcode) where barcode is not null;
create index if not exists foods_user_idx on public.foods (user_id);

drop trigger if exists foods_set_updated_at on public.foods;
create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;
grant select, insert, update, delete on public.foods to authenticated;

drop policy if exists foods_select_own on public.foods;
create policy foods_select_own on public.foods for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists foods_insert_own on public.foods;
create policy foods_insert_own on public.foods for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists foods_update_own on public.foods;
create policy foods_update_own on public.foods for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists foods_delete_own on public.foods;
create policy foods_delete_own on public.foods for delete
  to authenticated using ((select auth.uid()) = user_id);
