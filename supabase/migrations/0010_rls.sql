-- 0010_rls.sql
-- Row Level Security for profiles. Owner-only access keyed on auth.uid().
-- Pattern: TO authenticated + (select auth.uid()) ownership predicate.
-- (select auth.uid()) is wrapped in a subquery so the planner caches it per query.

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No DELETE policy: profiles are removed via auth.users cascade, not directly.
