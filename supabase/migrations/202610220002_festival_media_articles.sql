begin;
alter table public.companies add column if not exists logo_url text;
alter table public.teams add column if not exists final_place integer;
alter table public.teams add column if not exists group_name text;
alter table public.teams drop constraint if exists teams_final_place_valid;
alter table public.teams add constraint teams_final_place_valid check (final_place between 1 and 9999);
alter table public.teams drop constraint if exists teams_group_name_valid;
alter table public.teams add constraint teams_group_name_valid check (char_length(group_name) <= 60);
create table if not exists public.tournament_articles (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 1 and 180),
 body text not null default '' check (char_length(body) <= 30000),
 cover_url text,
 image_urls text[] not null default '{}' check (cardinality(image_urls) <= 12),
 status text not null default 'draft' check (status in ('draft','published')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 check (status <> 'published' or (published_at is not null and char_length(trim(body)) > 0))
);
create index if not exists tournament_articles_parent_idx on public.tournament_articles(tournament_id);
alter table public.tournament_articles enable row level security;
grant select on public.tournament_articles to anon,authenticated;
grant insert,update,delete on public.tournament_articles to authenticated;
drop policy if exists articles_read on public.tournament_articles;
create policy articles_read on public.tournament_articles for select to anon,authenticated using (
 exists (select 1 from public.tournaments t where t.id=tournament_id and
 (t.owner_id=auth.uid() or (t.status='published' and tournament_articles.status='published')))
);
drop policy if exists articles_insert on public.tournament_articles;
create policy articles_insert on public.tournament_articles for insert to authenticated with check (
 exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=auth.uid())
);
drop policy if exists articles_update on public.tournament_articles;
create policy articles_update on public.tournament_articles for update to authenticated using (
 exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=auth.uid())
) with check (exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=auth.uid()));
drop policy if exists articles_delete on public.tournament_articles;
create policy articles_delete on public.tournament_articles for delete to authenticated using (
 exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=auth.uid())
);
-- Images are public assets. Article drafts themselves remain protected by RLS.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tournament-media','tournament-media',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists festival_media_owner on storage.objects;
create policy festival_media_owner on storage.objects for all to authenticated
using (bucket_id='tournament-media' and exists(select 1 from public.tournaments t where t.id::text=split_part(storage.objects.name,'/',1) and t.owner_id=auth.uid()))
with check (bucket_id='tournament-media' and exists(select 1 from public.tournaments t where t.id::text=split_part(storage.objects.name,'/',1) and t.owner_id=auth.uid()));
-- Keep unrelated permissive policies from allowing writes into another festival's folder.
drop policy if exists festival_media_guard on storage.objects;
create policy festival_media_guard on storage.objects as restrictive for all to authenticated
using (bucket_id<>'tournament-media' or exists(select 1 from public.tournaments t where t.id::text=split_part(storage.objects.name,'/',1) and t.owner_id=auth.uid()))
with check (bucket_id<>'tournament-media' or exists(select 1 from public.tournaments t where t.id::text=split_part(storage.objects.name,'/',1) and t.owner_id=auth.uid()));
commit;
