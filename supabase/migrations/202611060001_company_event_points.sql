-- One manager-assigned score per company and sport/category.
-- Run in the existing Tournament Supabase project. Safe to run again.
begin;

create unique index if not exists app_companies_id_tournament_idx on public.companies(id,tournament_id);
create unique index if not exists app_events_id_tournament_idx on public.tournament_events(id,tournament_id);

create table if not exists public.company_event_points (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  company_id uuid not null,
  tournament_event_id uuid not null,
  points numeric not null check (points between 0 and 9999 and points = round(points,2)),
  updated_at timestamptz not null default now(),
  primary key (company_id,tournament_event_id),
  foreign key (company_id,tournament_id) references public.companies(id,tournament_id) on delete cascade,
  foreign key (tournament_event_id,tournament_id) references public.tournament_events(id,tournament_id) on delete cascade
);
create index if not exists app_company_points_tournament_idx on public.company_event_points(tournament_id);
alter table public.company_event_points enable row level security;
revoke all on public.company_event_points from public,anon,authenticated;
grant select on public.company_event_points to anon,authenticated;
grant insert,update,delete on public.company_event_points to authenticated;

drop policy if exists company_points_read on public.company_event_points;
create policy company_points_read on public.company_event_points for select to anon,authenticated
using (exists (select 1 from public.tournaments t where t.id=tournament_id
  and (t.status='published' or t.owner_id=(select auth.uid()))));
drop policy if exists company_points_write on public.company_event_points;
create policy company_points_write on public.company_event_points for all to authenticated
using (exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=(select auth.uid())))
with check (exists (select 1 from public.tournaments t where t.id=tournament_id and t.owner_id=(select auth.uid())));

-- A company's edits, including clearing scores, commit as one transaction.
-- Compare the values shown to the manager to avoid overwriting another edit.
create or replace function public.set_company_event_points(
  p_tournament_id uuid, p_company_id uuid, p_scores jsonb
) returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  entry jsonb;
  event_id uuid;
  new_points numeric;
  expected_points numeric;
  current_points numeric;
  affected integer := 0;
begin
  if not exists (select 1 from public.tournaments where id=p_tournament_id and owner_id=(select auth.uid())) then
    raise exception 'Tournament owner required' using errcode='42501';
  end if;
  perform 1 from public.companies where id=p_company_id and tournament_id=p_tournament_id for update;
  if not found then raise exception 'Company not in tournament' using errcode='23514'; end if;
  if p_scores is null or jsonb_typeof(p_scores)<>'array' then
    raise exception 'Scores must be an array' using errcode='23514';
  end if;
  if jsonb_array_length(p_scores)>1000 or
     (select count(distinct value->>'tournament_event_id') from jsonb_array_elements(p_scores))<>jsonb_array_length(p_scores) then
    raise exception 'Duplicate or excessive score entries' using errcode='23514';
  end if;
  for entry in select value from jsonb_array_elements(p_scores) loop
    if jsonb_typeof(entry)<>'object' or not (entry ?& array['tournament_event_id','points','expected_points'])
       or jsonb_typeof(entry->'tournament_event_id')<>'string'
       or jsonb_typeof(entry->'points') not in ('number','null')
       or jsonb_typeof(entry->'expected_points') not in ('number','null') then
      raise exception 'Invalid score entry' using errcode='23514';
    end if;
    event_id := (entry->>'tournament_event_id')::uuid;
    new_points := (entry->>'points')::numeric;
    expected_points := (entry->>'expected_points')::numeric;
    if not exists (select 1 from public.tournament_events where id=event_id and tournament_id=p_tournament_id) then
      raise exception 'Sport not in tournament' using errcode='23514';
    end if;
    if new_points is not null and not (new_points between 0 and 9999 and new_points=round(new_points,2)) then
      raise exception 'Invalid points' using errcode='23514';
    end if;
    select points into current_points from public.company_event_points
      where company_id=p_company_id and tournament_event_id=event_id;
    if current_points is distinct from expected_points then
      raise exception 'Points changed since editing began' using errcode='40001';
    end if;
    if new_points is null then
      delete from public.company_event_points where company_id=p_company_id and tournament_event_id=event_id;
    else
      insert into public.company_event_points(tournament_id,company_id,tournament_event_id,points)
      values (p_tournament_id,p_company_id,event_id,new_points)
      on conflict (company_id,tournament_event_id) do update set points=excluded.points, updated_at=now();
    end if;
    affected := affected + 1;
  end loop;
  return affected;
end $$;
revoke all on function public.set_company_event_points(uuid,uuid,jsonb) from public,anon;
grant execute on function public.set_company_event_points(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
