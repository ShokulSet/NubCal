-- 0003_nutrient_definitions.sql
-- Per-user catalog of trackable nutrients (the arbitrary-nutrient backbone).
-- Defaults are seeded per user by the app (lib/nutrition/defaults).

create table if not exists public.nutrient_definitions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  key          text not null,                 -- canonical slug: energy_kcal, protein, sodium...
  display_name text not null,
  unit         text not null,                 -- kcal | g | mg | mcg
  kind         text not null default 'other', -- energy | macro | micro | other
  is_energy    boolean not null default false,
  sort_order   integer not null default 100,
  created_at   timestamptz not null default now()
);

create unique index if not exists nutrient_definitions_user_key_uniq
  on public.nutrient_definitions (user_id, key);
create index if not exists nutrient_definitions_user_idx
  on public.nutrient_definitions (user_id);

alter table public.nutrient_definitions enable row level security;
grant select, insert, update, delete on public.nutrient_definitions to authenticated;

drop policy if exists nd_select_own on public.nutrient_definitions;
create policy nd_select_own on public.nutrient_definitions for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists nd_insert_own on public.nutrient_definitions;
create policy nd_insert_own on public.nutrient_definitions for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists nd_update_own on public.nutrient_definitions;
create policy nd_update_own on public.nutrient_definitions for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists nd_delete_own on public.nutrient_definitions;
create policy nd_delete_own on public.nutrient_definitions for delete
  to authenticated using ((select auth.uid()) = user_id);
