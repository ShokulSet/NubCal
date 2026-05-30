-- 0006_food_nutrients.sql
-- Source-of-truth per-serving nutrient amounts for each food. A trigger keeps
-- foods.nutrients (the JSONB display cache) in sync on every change.

create table if not exists public.food_nutrients (
  food_id     uuid not null references public.foods (id) on delete cascade,
  nutrient_id uuid not null references public.nutrient_definitions (id) on delete cascade,
  amount      numeric not null, -- per ONE serving, in the nutrient's unit
  primary key (food_id, nutrient_id)
);

create index if not exists food_nutrients_nutrient_idx
  on public.food_nutrients (nutrient_id);

-- Rebuild foods.nutrients = {key: amount} from the normalized rows.
-- SECURITY INVOKER: runs as the calling user; RLS on foods (owner) still applies.
-- search_path pinned to '' so every reference is fully qualified.
create or replace function public.sync_food_nutrients_jsonb()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fid uuid := coalesce(new.food_id, old.food_id);
begin
  update public.foods f
  set nutrients = coalesce((
        select jsonb_object_agg(nd.key, fn.amount)
        from public.food_nutrients fn
        join public.nutrient_definitions nd on nd.id = fn.nutrient_id
        where fn.food_id = fid
      ), '{}'::jsonb),
      updated_at = now()
  where f.id = fid;
  return null;
end;
$$;

drop trigger if exists food_nutrients_sync on public.food_nutrients;
create trigger food_nutrients_sync
  after insert or update or delete on public.food_nutrients
  for each row execute function public.sync_food_nutrients_jsonb();

alter table public.food_nutrients enable row level security;
grant select, insert, update, delete on public.food_nutrients to authenticated;

-- Ownership is inherited from the parent food.
drop policy if exists fn_select_own on public.food_nutrients;
create policy fn_select_own on public.food_nutrients for select
  to authenticated using (exists (
    select 1 from public.foods f
    where f.id = food_id and f.user_id = (select auth.uid())
  ));
drop policy if exists fn_insert_own on public.food_nutrients;
create policy fn_insert_own on public.food_nutrients for insert
  to authenticated with check (exists (
    select 1 from public.foods f
    where f.id = food_id and f.user_id = (select auth.uid())
  ));
drop policy if exists fn_update_own on public.food_nutrients;
create policy fn_update_own on public.food_nutrients for update
  to authenticated using (exists (
    select 1 from public.foods f
    where f.id = food_id and f.user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.foods f
    where f.id = food_id and f.user_id = (select auth.uid())
  ));
drop policy if exists fn_delete_own on public.food_nutrients;
create policy fn_delete_own on public.food_nutrients for delete
  to authenticated using (exists (
    select 1 from public.foods f
    where f.id = food_id and f.user_id = (select auth.uid())
  ));
