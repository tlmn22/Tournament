-- Buuruljuutcup2026: run in the intended project's Supabase SQL Editor.
-- Creates a draft owned by the existing admin@gmail.com user. No users/passwords are changed.
-- Group membership and later-stage rules are recorded in the description.
-- The current app has no separate group-membership/standings table.
begin;
do $$
declare
  owner_uuid uuid;
  tournament_uuid uuid := gen_random_uuid();
  event_uuid uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); a3 uuid := gen_random_uuid();
  b1 uuid := gen_random_uuid(); b2 uuid := gen_random_uuid(); b3 uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid();
  created timestamptz := clock_timestamp();
begin
  if (select count(*) from auth.users where lower(email) = 'admin@gmail.com') <> 1 then
    raise exception 'Expected exactly one registered admin@gmail.com user. Register the account first.';
  end if;
  select id into owner_uuid from auth.users where lower(email) = 'admin@gmail.com';
  -- Serializes re-runs of this seed to avoid duplicate drafts.
  perform pg_advisory_xact_lock(hashtext('Buuruljuutcup2026:' || owner_uuid::text));
  if exists (select 1 from public.tournaments where owner_id = owner_uuid and lower(name) = 'buuruljuutcup2026') then
    raise exception 'Buuruljuutcup2026 already exists for this owner. No duplicate was created.';
  end if;
  if to_regclass('public.tournament_fixtures') is null then
    raise exception 'Run the tournament_workspace migration first.';
  end if;

  insert into public.tournaments(id,owner_id,name,description,status)
  values(tournament_uuid,owner_uuid,'Buuruljuutcup2026',
    E'Сагсан бөмбөг · Эрэгтэй\n\nХэсгийн шат — 9 баг, 3 хэсэг:\nGroup A: ТҮГ 2, Оффис 2, УУГ 1\nGroup B: Оффис 1, ЦСҮГ 2, ЦСҮГ 3\nGroup C: ТҮГ 1, ЦСҮГ 1, УУГ 2\n\nХэсэг бүрд багууд хоорондоо нэг удаа тоглоно — нийт 9 тоглолт.\n\nШалгарах шат: A1–B2, B1–C2, C1–A2. Багууд тодроход тоглолтуудыг нэмнэ.\n\nМедалийн шат: шалгарсан 3 баг хоорондоо тойргоор тоглоно. Эдгээр 3 тоглолтыг тухайн үед гараар үүсгэнэ.\n\nТэмцээний нийт төлөвлөгөө: 15 тоглолт.',
    'draft');
  insert into public.tournament_events(id,tournament_id,name,sport,format)
  values(event_uuid,tournament_uuid,'Сагсан бөмбөг · Эрэгтэй','basketball','other');
  insert into public.teams(id,tournament_event_id,name,created_at) values
    (a1,event_uuid,'ТҮГ 2',created),
    (a2,event_uuid,'Оффис 2',created+interval '1 millisecond'),
    (a3,event_uuid,'УУГ 1',created+interval '2 milliseconds'),
    (b1,event_uuid,'Оффис 1',created+interval '3 milliseconds'),
    (b2,event_uuid,'ЦСҮГ 2',created+interval '4 milliseconds'),
    (b3,event_uuid,'ЦСҮГ 3',created+interval '5 milliseconds'),
    (c1,event_uuid,'ТҮГ 1',created+interval '6 milliseconds'),
    (c2,event_uuid,'ЦСҮГ 1',created+interval '7 milliseconds'),
    (c3,event_uuid,'УУГ 2',created+interval '8 milliseconds');
  -- Screenshot order; no time, venue or invented scores.
  insert into public.tournament_fixtures(tournament_event_id,home_team_id,away_team_id,round,status,created_at) values
    (event_uuid,a3,a2,'Group A · Хэсгийн шат','scheduled',created),
    (event_uuid,b3,b2,'Group B · Хэсгийн шат','scheduled',created+interval '1 millisecond'),
    (event_uuid,c3,c2,'Group C · Хэсгийн шат','scheduled',created+interval '2 milliseconds'),
    (event_uuid,a2,a1,'Group A · Хэсгийн шат','scheduled',created+interval '3 milliseconds'),
    (event_uuid,b2,b1,'Group B · Хэсгийн шат','scheduled',created+interval '4 milliseconds'),
    (event_uuid,c2,c1,'Group C · Хэсгийн шат','scheduled',created+interval '5 milliseconds'),
    (event_uuid,a1,a3,'Group A · Хэсгийн шат','scheduled',created+interval '6 milliseconds'),
    (event_uuid,b1,b3,'Group B · Хэсгийн шат','scheduled',created+interval '7 milliseconds'),
    (event_uuid,c1,c3,'Group C · Хэсгийн шат','scheduled',created+interval '8 milliseconds');
end $$;
commit;

select t.name, t.status, '/admin/tournaments/' || t.id::text as admin_path,
  (select count(*) from public.teams tm join public.tournament_events e on e.id=tm.tournament_event_id where e.tournament_id=t.id) as teams,
  (select count(*) from public.tournament_fixtures f join public.tournament_events e on e.id=f.tournament_event_id where e.tournament_id=t.id) as matches
from public.tournaments t join auth.users u on u.id=t.owner_id
where lower(u.email)='admin@gmail.com' and t.name='Buuruljuutcup2026';
