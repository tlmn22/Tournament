begin;
-- Per-tournament public page look: 'default' (light) or 'neon' (dark event branding).
alter table public.tournaments add column if not exists theme text not null default 'default';
alter table public.tournaments drop constraint if exists tournaments_theme_check;
alter table public.tournaments add constraint tournaments_theme_check check (theme in ('default','neon'));
commit;
