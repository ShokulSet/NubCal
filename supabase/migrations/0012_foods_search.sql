-- 0012_foods_search.sql
-- Trigram indexes for fuzzy food search (English + Thai names).
-- pg_trgm lives in the extensions schema (see 0001).

create index if not exists foods_name_trgm
  on public.foods using gin (name extensions.gin_trgm_ops);

create index if not exists foods_name_th_trgm
  on public.foods using gin (name_th extensions.gin_trgm_ops);
