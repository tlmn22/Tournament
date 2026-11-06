-- Tournament workspace, compatible with existing tournaments/events/teams/companies.
-- Run once in Supabase SQL Editor, in the intended project.
-- Keeps all existing rows. Replaces policies on these five tables with owner/public rules.
-- Existing unrelated tables (including matches) are not modified.
begin;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published')),
  start_date date, end_date date, created_at timestamptz not null default now()
);
create table if not exists public.tournament_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id),
  name text not null, sport text not null, format text not null default 'other',
  created_at timestamptz not null default now()
);
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id),
  name text not null, logo_url text, created_at timestamptz not null default now()
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id),
  company_id uuid references public.companies(id),
  name text not null, created_at timestamptz not null default now()
);

create index if not exists app_tournaments_owner_idx on public.tournaments(owner_id);
create index if not exists app_tournaments_status_idx on public.tournaments(status, created_at desc);
create index if not exists app_events_tournament_idx on public.tournament_events(tournament_id);
create index if not exists app_companies_tournament_idx on public.companies(tournament_id);
create index if not exists app_teams_event_idx on public.teams(tournament_event_id);
create unique index if not exists app_teams_id_event_idx on public.teams(id,tournament_event_id);

-- A separate fixture table avoids altering an existing legacy matches schema.
create table public.tournament_fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_event_id uuid not null references public.tournament_events(id),
  home_team_id uuid not null,
  away_team_id uuid not null,
  starts_at timestamptz,
  venue text not null default '' check (length(venue) <= 160),
  round text not null default '' check (length(round) <= 100),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed')),
  home_score integer check (home_score between 0 and 9999),
  away_score integer check (away_score between 0 and 9999),
  created_at timestamptz not null default now(),
  foreign key (home_team_id,tournament_event_id) references public.teams(id,tournament_event_id),
  foreign key (away_team_id,tournament_event_id) references public.teams(id,tournament_event_id),
  check (home_team_id <> away_team_id),
  check ((status = 'scheduled' and home_score is null and away_score is null)
    or (status in ('live','completed') and home_score is not null and away_score is not null))
);
create index app_fixtures_event_time_idx on public.tournament_fixtures(tournament_event_id,starts_at);

-- Prevent moving rows to another parent or assigning a company from another tournament.
create function public.app_validate_tournament_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'tournaments' then
    if char_length(btrim(new.name)) < 1 or char_length(new.name) > 160
      or char_length(coalesce(new.description,'')) > 5000
      or new.end_date < new.start_date then
      raise exception 'Invalid tournament information' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
      raise exception 'Tournament ownership cannot be changed' using errcode = '42501';
    end if;
  elsif tg_table_name in ('tournament_events','companies') then
    if char_length(btrim(new.name)) < 1 or char_length(new.name) > 160 then
      raise exception 'Invalid name' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and new.tournament_id is distinct from old.tournament_id then
      raise exception 'Parent tournament cannot be changed' using errcode = '23514';
    end if;
  elsif tg_table_name = 'teams' then
    if char_length(btrim(new.name)) < 1 or char_length(new.name) > 120 then
      raise exception 'Invalid team name' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and new.tournament_event_id is distinct from old.tournament_event_id then
      raise exception 'Team category cannot be changed' using errcode = '23514';
    end if;
    if new.company_id is not null and not exists (
      select 1 from public.companies c join public.tournament_events e on e.tournament_id = c.tournament_id
      where c.id = new.company_id and e.id = new.tournament_event_id
    ) then
      raise exception 'Company must belong to the same tournament' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.app_validate_tournament_row() from public;
create trigger app_validate_tournament before insert or update on public.tournaments for each row execute function public.app_validate_tournament_row();
create trigger app_validate_event before insert or update on public.tournament_events for each row execute function public.app_validate_tournament_row();
create trigger app_validate_company before insert or update on public.companies for each row execute function public.app_validate_tournament_row();
create trigger app_validate_team before insert or update on public.teams for each row execute function public.app_validate_tournament_row();

-- An old permissive policy would OR with new policies: replace the policies explicitly.
do $$
declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies
    where schemaname = 'public' and tablename in ('tournaments','tournament_events','companies','teams','tournament_fixtures')
  loop execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
end $$;

alter table public.tournaments enable row level security;
alter table public.tournament_events enable row level security;
alter table public.companies enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_fixtures enable row level security;
revoke all on public.tournaments,public.tournament_events,public.companies,public.teams,public.tournament_fixtures from public,anon,authenticated;
grant select on public.tournaments,public.tournament_events,public.companies,public.teams,public.tournament_fixtures to anon;
grant select,insert,update,delete on public.tournaments,public.tournament_events,public.companies,public.teams,public.tournament_fixtures to authenticated;

create policy app_tournaments_read on public.tournaments for select to anon,authenticated
  using (status = 'published' or owner_id = (select auth.uid()));
create policy app_tournaments_insert on public.tournaments for insert to authenticated
  with check (owner_id = (select auth.uid()) and status in ('draft','published'));
create policy app_tournaments_update on public.tournaments for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and status in ('draft','published'));
create policy app_tournaments_delete on public.tournaments for delete to authenticated using (owner_id = (select auth.uid()));

create policy app_events_read on public.tournament_events for select to anon,authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id));
create policy app_events_write on public.tournament_events for all to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())));
create policy app_companies_read on public.companies for select to anon,authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id));
create policy app_companies_write on public.companies for all to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())));
create policy app_teams_read on public.teams for select to anon,authenticated
  using (exists (select 1 from public.tournament_events e where e.id = tournament_event_id));
create policy app_teams_write on public.teams for all to authenticated
  using (exists (select 1 from public.tournament_events e join public.tournaments t on t.id=e.tournament_id
    where e.id=tournament_event_id and t.owner_id=(select auth.uid())))
  with check (exists (select 1 from public.tournament_events e join public.tournaments t on t.id=e.tournament_id
    where e.id=tournament_event_id and t.owner_id=(select auth.uid())));
create policy app_fixtures_read on public.tournament_fixtures for select to anon,authenticated
  using (exists (select 1 from public.tournament_events e where e.id=tournament_event_id));
create policy app_fixtures_write on public.tournament_fixtures for all to authenticated
  using (exists (select 1 from public.tournament_events e join public.tournaments t on t.id=e.tournament_id
    where e.id=tournament_event_id and t.owner_id=(select auth.uid())))
  with check (exists (select 1 from public.tournament_events e join public.tournaments t on t.id=e.tournament_id
    where e.id=tournament_event_id and t.owner_id=(select auth.uid())));
notify pgrst,'reload schema';
commit;
