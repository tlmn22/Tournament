-- Optional per-team standings details (e.g. chess Swiss table: games, +/=/-, MP, EDE, BH:GP).
-- Run in the existing Tournament Supabase project. Safe to run again.
begin;

alter table public.teams add column if not exists result_details jsonb;
alter table public.teams drop constraint if exists teams_result_details_object;
alter table public.teams add constraint teams_result_details_object check (result_details is null or jsonb_typeof(result_details) = 'object');

notify pgrst,'reload schema';
commit;
