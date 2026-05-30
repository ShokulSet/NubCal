-- 0007_meals.sql
-- A logged eating occasion. eaten_on is the date in the user's timezone
-- (resolved app-side) so the daily boundary is correct for Asia/Bangkok.

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  eaten_on   date not null,
  eaten_at   timestamptz not null default now(),
  meal_type  text not null default 'other', -- breakfast | lunch | dinner | snack | other
  note       text,
  photo_path text,
  status     text not null default 'logged', -- analyzing | logged
  created_at timestamptz not null default now()
);

create index if not exists meals_user_date_idx on public.meals (user_id, eaten_on);

alter table public.meals enable row level security;
grant select, insert, update, delete on public.meals to authenticated;

drop policy if exists meals_select_own on public.meals;
create policy meals_select_own on public.meals for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists meals_insert_own on public.meals;
create policy meals_insert_own on public.meals for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists meals_update_own on public.meals;
create policy meals_update_own on public.meals for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists meals_delete_own on public.meals;
create policy meals_delete_own on public.meals for delete
  to authenticated using ((select auth.uid()) = user_id);
