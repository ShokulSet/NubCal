-- 0008_meal_items.sql
-- A line item in a meal. nutrients_snapshot freezes the per-serving values at
-- log time, so later edits to a food never rewrite history. user_id is
-- denormalized for cheap RLS. Contribution = nutrients_snapshot[key] * quantity.

create table if not exists public.meal_items (
  id                 uuid primary key default gen_random_uuid(),
  meal_id            uuid not null references public.meals (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  food_id            uuid references public.foods (id) on delete set null,
  name               text not null,
  quantity           numeric not null default 1, -- number of servings
  serving_size       numeric not null default 100,
  serving_unit       text not null default 'g',
  nutrients_snapshot jsonb not null default '{}'::jsonb, -- per-serving {key: amount}
  created_at         timestamptz not null default now()
);

create index if not exists meal_items_meal_idx on public.meal_items (meal_id);
create index if not exists meal_items_user_idx on public.meal_items (user_id);

alter table public.meal_items enable row level security;
grant select, insert, update, delete on public.meal_items to authenticated;

drop policy if exists mi_select_own on public.meal_items;
create policy mi_select_own on public.meal_items for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists mi_insert_own on public.meal_items;
create policy mi_insert_own on public.meal_items for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists mi_update_own on public.meal_items;
create policy mi_update_own on public.meal_items for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists mi_delete_own on public.meal_items;
create policy mi_delete_own on public.meal_items for delete
  to authenticated using ((select auth.uid()) = user_id);
