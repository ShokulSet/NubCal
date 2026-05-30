-- 0004_nutrient_targets.sql
-- Per-user nutrient goals. day_of_week NULL = default for all days;
-- a day-specific row (0=Sun..6=Sat) overrides the default for that day.

create table if not exists public.nutrient_targets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  nutrient_id  uuid not null references public.nutrient_definitions (id) on delete cascade,
  day_of_week  smallint check (day_of_week between 0 and 6),
  direction    text not null default 'at_least', -- at_least | at_most | around
  target_value numeric,
  target_min   numeric,
  target_max   numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- one default per (user, nutrient); one row per (user, nutrient, weekday)
create unique index if not exists nutrient_targets_default_uniq
  on public.nutrient_targets (user_id, nutrient_id) where day_of_week is null;
create unique index if not exists nutrient_targets_dow_uniq
  on public.nutrient_targets (user_id, nutrient_id, day_of_week) where day_of_week is not null;
create index if not exists nutrient_targets_user_idx
  on public.nutrient_targets (user_id);

drop trigger if exists nutrient_targets_set_updated_at on public.nutrient_targets;
create trigger nutrient_targets_set_updated_at before update on public.nutrient_targets
  for each row execute function public.set_updated_at();

alter table public.nutrient_targets enable row level security;
grant select, insert, update, delete on public.nutrient_targets to authenticated;

drop policy if exists nt_select_own on public.nutrient_targets;
create policy nt_select_own on public.nutrient_targets for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists nt_insert_own on public.nutrient_targets;
create policy nt_insert_own on public.nutrient_targets for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists nt_update_own on public.nutrient_targets;
create policy nt_update_own on public.nutrient_targets for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists nt_delete_own on public.nutrient_targets;
create policy nt_delete_own on public.nutrient_targets for delete
  to authenticated using ((select auth.uid()) = user_id);
