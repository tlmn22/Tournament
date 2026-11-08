-- Buuruljuutcup2026 / admin@gmail.com / women's chess.
-- Preserves existing data; conflicting pre-existing results abort the import.
-- 8 final standings; 28 games. Unresolved results are not imported.
begin;
-- Preserve the existing sport rule while allowing the new individual sports.
do $sports$
declare previous_rule text;
begin
 select pg_get_expr(conbin, conrelid) into previous_rule
 from pg_constraint
 where conrelid='public.tournament_events'::regclass
   and conname='tournament_events_sport_check' and contype='c';
 if previous_rule is not null then
   alter table public.tournament_events drop constraint tournament_events_sport_check;
   execute format(
     'alter table public.tournament_events add constraint tournament_events_sport_check check ((%s) or sport in (''chess'',''checkers'',''darts''))',
     previous_rule
   );
 end if;
end $sports$;
alter table public.tournament_fixtures alter column home_score type numeric using home_score::numeric;
alter table public.tournament_fixtures alter column away_score type numeric using away_score::numeric;
alter table public.teams add column if not exists final_place integer check (final_place between 1 and 9999);
alter table public.teams add column if not exists result_points numeric check (result_points between 0 and 9999);
alter table public.tournament_events add column if not exists results_note text;
commit;

begin;
do $import$
declare
 owner_uuid uuid; tid uuid; eid uuid; cid uuid; pid uuid; wid uuid; bid uuid;
 r record; existing record;
begin
 select id into strict owner_uuid from auth.users where lower(email)='admin@gmail.com';
 perform pg_advisory_xact_lock(hashtext('Buuruljuutcup2026:' || owner_uuid::text));
 if (select count(*) from public.tournaments where owner_id=owner_uuid and lower(name)='buuruljuutcup2026') > 1 then
 raise exception 'Multiple matching festivals; resolve before import'; end if;
 select id into tid from public.tournaments where owner_id=owner_uuid and lower(name)='buuruljuutcup2026';
 if tid is null then
 insert into public.tournaments(owner_id,name,status) values(owner_uuid,'Buuruljuutcup2026','draft') returning id into tid;
 end if;
 for r in select unnest(array['ЦСҮГ','ТҮГ','УУГ','Оффис']) as name loop
 if (select count(*) from public.companies where tournament_id=tid and name=r.name)>1 then raise exception 'Duplicate organization: %',r.name; end if;
 if not exists(select 1 from public.companies where tournament_id=tid and name=r.name) then
 insert into public.companies(tournament_id,name) values(tid,r.name); end if;
 end loop;
 if (select count(*) from public.tournament_events where tournament_id=tid and name='Шатар · Эмэгтэй')>1 then raise exception 'Duplicate chess event'; end if;
 select id into eid from public.tournament_events where tournament_id=tid and name='Шатар · Эмэгтэй';
 if eid is null then
 insert into public.tournament_events(tournament_id,name,sport,format,results_note)
 values(tid,'Шатар · Эмэгтэй','chess','other','Эцсийн байр, оноог албан дүнгээс оруулсан. 7 өргийн 28 тоглолт. Тэмцээн болсон огноо баталгаажаагүй.') returning id into eid;
 elsif (select sport from public.tournament_events where id=eid)<>'chess' then raise exception 'Existing event sport differs';
 end if;
 for r in select * from (values
('Төгсжаргал Р','ЦСҮГ',1,7),
('Намжилмаа С','ТҮГ',2,6),
('Энхтуяа Б','ТҮГ',3,5),
('Гончигсүрэн Б','УУГ',4,3),
('Тэгшзаяа Ү','ЦСҮГ',5,3),
('Болормаа Л','УУГ',6,2),
('Уранцэцэг Б','УУГ',7,2),
('Ундрам П','ЦСҮГ',8,0)
 ) as v(name,organization,place,points) loop
 select id into strict cid from public.companies where tournament_id=tid and name=r.organization;
 if (select count(*) from public.teams where tournament_event_id=eid and name=r.name)>1 then raise exception 'Duplicate participant: %',r.name; end if;
 select * into existing from public.teams where tournament_event_id=eid and name=r.name;
 if found then
 if existing.company_id is distinct from cid or (existing.final_place is not null and existing.final_place<>r.place) or (existing.result_points is not null and existing.result_points<>r.points) then raise exception 'Conflicting participant: %',r.name; end if;
 update public.teams set final_place=r.place,result_points=r.points where id=existing.id;
 else
 insert into public.teams(tournament_event_id,company_id,name,final_place,result_points) values(eid,cid,r.name,r.place,r.points);
 end if;
 end loop;
 for r in select * from (values
('Намжилмаа С','Уранцэцэг Б','1-р өрөг · 1-р ширээ',1,0),
('Энхтуяа Б','Гончигсүрэн Б','1-р өрөг · 2-р ширээ',1,0),
('Төгсжаргал Р','Болормаа Л','1-р өрөг · 3-р ширээ',1,0),
('Тэгшзаяа Ү','Ундрам П','1-р өрөг · 4-р ширээ',1,0),
('Уранцэцэг Б','Ундрам П','2-р өрөг · 1-р ширээ',1,0),
('Болормаа Л','Тэгшзаяа Ү','2-р өрөг · 2-р ширээ',0,1),
('Гончигсүрэн Б','Төгсжаргал Р','2-р өрөг · 3-р ширээ',0,1),
('Намжилмаа С','Энхтуяа Б','2-р өрөг · 4-р ширээ',1,0),
('Энхтуяа Б','Уранцэцэг Б','3-р өрөг · 1-р ширээ',1,0),
('Төгсжаргал Р','Намжилмаа С','3-р өрөг · 2-р ширээ',1,0),
('Тэгшзаяа Ү','Гончигсүрэн Б','3-р өрөг · 3-р ширээ',0,1),
('Ундрам П','Болормаа Л','3-р өрөг · 4-р ширээ',0,1),
('Уранцэцэг Б','Болормаа Л','4-р өрөг · 1-р ширээ',0,1),
('Гончигсүрэн Б','Ундрам П','4-р өрөг · 2-р ширээ',1,0),
('Намжилмаа С','Тэгшзаяа Ү','4-р өрөг · 3-р ширээ',1,0),
('Энхтуяа Б','Төгсжаргал Р','4-р өрөг · 4-р ширээ',0,1),
('Төгсжаргал Р','Уранцэцэг Б','5-р өрөг · 1-р ширээ',1,0),
('Тэгшзаяа Ү','Энхтуяа Б','5-р өрөг · 2-р ширээ',0,1),
('Ундрам П','Намжилмаа С','5-р өрөг · 3-р ширээ',0,1),
('Болормаа Л','Гончигсүрэн Б','5-р өрөг · 4-р ширээ',0,1),
('Уранцэцэг Б','Гончигсүрэн Б','6-р өрөг · 1-р ширээ',1,0),
('Намжилмаа С','Болормаа Л','6-р өрөг · 2-р ширээ',1,0),
('Энхтуяа Б','Ундрам П','6-р өрөг · 3-р ширээ',1,0),
('Төгсжаргал Р','Тэгшзаяа Ү','6-р өрөг · 4-р ширээ',1,0),
('Тэгшзаяа Ү','Уранцэцэг Б','7-р өрөг · 1-р ширээ',1,0),
('Ундрам П','Төгсжаргал Р','7-р өрөг · 2-р ширээ',0,1),
('Болормаа Л','Энхтуяа Б','7-р өрөг · 3-р ширээ',0,1),
('Гончигсүрэн Б','Намжилмаа С','7-р өрөг · 4-р ширээ',0,1)
 ) as v(white_name,black_name,round_name,white_score,black_score) loop
 select id into strict wid from public.teams where tournament_event_id=eid and name=r.white_name;
 select id into strict bid from public.teams where tournament_event_id=eid and name=r.black_name;
 if (select count(*) from public.tournament_fixtures where tournament_event_id=eid and round=r.round_name)>1 then raise exception 'Duplicate round/board: %',r.round_name; end if;
 select * into existing from public.tournament_fixtures where tournament_event_id=eid and round=r.round_name;
 if found then
 if existing.home_team_id<>wid or existing.away_team_id<>bid or existing.status<>'completed' or existing.home_score is distinct from r.white_score or existing.away_score is distinct from r.black_score then raise exception 'Conflicting game: %',r.round_name; end if;
 else
 insert into public.tournament_fixtures(tournament_event_id,home_team_id,away_team_id,round,status,home_score,away_score)
 values(eid,wid,bid,r.round_name,'completed',r.white_score,r.black_score);
 end if;
 end loop;
end $import$;
commit;
select t.name,e.name as event_name,
 (select count(*) from public.teams where tournament_event_id=e.id) as participants,
 (select count(*) from public.tournament_fixtures where tournament_event_id=e.id) as games
from public.tournaments t join public.tournament_events e on e.tournament_id=t.id
join auth.users u on u.id=t.owner_id
where lower(u.email)='admin@gmail.com' and lower(t.name)='buuruljuutcup2026' and e.name='Шатар · Эмэгтэй';
