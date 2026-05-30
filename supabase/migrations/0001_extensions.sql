-- 0001_extensions.sql
-- Postgres extensions used across NubCal.

-- Installed in the `extensions` schema (not `public`) per Supabase advisors.
-- gen_random_uuid() etc. (usually present on Supabase, declared for portability).
create extension if not exists pgcrypto with schema extensions;

-- Trigram search for fuzzy food name lookup (used from Milestone 1+).
create extension if not exists pg_trgm with schema extensions;
