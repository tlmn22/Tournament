-- Run in Supabase SQL Editor. Deletes only one exact-name record in the named owner's festival.
-- Does not delete related participants, fixtures or recorded results.
begin;
do $delete_team$
declare
 owner_uuid uuid; festival_uuid uuid; target record; matches_count integer;
begin
 select id into strict owner_uuid from auth.users where lower(email)='admin@gmail.com';
 select id into strict festival_uuid from public.tournaments
 where owner_id=owner_uuid and lower(btrim(name))='buuruljuutcup2026';
 select count(*) into matches_count from (
   select id from public.companies where tournament_id=festival_uuid and btrim(name)='Цэцэнс'
   union all
   select tm.id from public.teams tm join public.tournament_events e on e.id=tm.tournament_event_id
   where e.tournament_id=festival_uuid and btrim(tm.name)='Цэцэнс'
 ) candidates;
 if matches_count=0 then raise notice 'Цэцэнс not found; nothing deleted.'; return; end if;
 if matches_count<>1 then raise exception 'Multiple Цэцэнс records found; select a specific record before deleting.'; end if;
 select * into target from (
   select id,'companies' as kind from public.companies where tournament_id=festival_uuid and btrim(name)='Цэцэнс'
   union all
   select tm.id,'teams' as kind from public.teams tm join public.tournament_events e on e.id=tm.tournament_event_id
   where e.tournament_id=festival_uuid and btrim(tm.name)='Цэцэнс'
 ) candidates;
 if target.kind='companies' then
   perform 1 from public.companies where id=target.id for update;
   if exists(select 1 from public.teams where company_id=target.id) then
     raise exception 'Цэцэнс has linked sport participants; nothing deleted.';
   end if;
   delete from public.companies where id=target.id;
 else
   perform 1 from public.teams where id=target.id for update;
   if exists(select 1 from public.tournament_fixtures where home_team_id=target.id or away_team_id=target.id)
      or exists(select 1 from public.teams tm where tm.id=target.id and
        ((to_jsonb(tm)->>'final_place') is not null or (to_jsonb(tm)->>'result_points') is not null)) then
     raise exception 'Цэцэнс has fixtures or recorded results; nothing deleted.';
   end if;
   delete from public.teams where id=target.id;
 end if;
 raise notice 'Deleted Цэцэнс from % (id=%).',target.kind,target.id;
end $delete_team$;
commit;
