-- 0001_extensions.sql
-- Postgres extensions used across NubCal.

-- gen_random_uuid() etc. (usually present on Supabase, declared for portability).
create extension if not exists pgcrypto;

-- Trigram search for fuzzy food name lookup (used from Milestone 1+).
create extension if not exists pg_trgm;
