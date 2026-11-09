-- Optional 3:1 cover image shown above the public tournament page.
-- Run in the existing Tournament Supabase project. Safe to run again.
begin;

alter table public.tournaments add column if not exists cover_url text;
alter table public.tournaments drop constraint if exists tournaments_cover_url_https;
alter table public.tournaments add constraint tournaments_cover_url_https check (cover_url is null or (cover_url like 'https://%' and length(cover_url) <= 2048));

notify pgrst,'reload schema';
commit;
