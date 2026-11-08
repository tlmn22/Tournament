-- Buuruljuutcup2026 / admin@gmail.com / men's chess.
-- Preserves existing data; conflicting pre-existing results abort the import.
-- 18 final standings; 54 evidenced games. Round 2 is NOT fabricated.
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
 if (select count(*) from public.tournament_events where tournament_id=tid and name='Шатар · Эрэгтэй')>1 then raise exception 'Duplicate chess event'; end if;
 select id into eid from public.tournament_events where tournament_id=tid and name='Шатар · Эрэгтэй';
 if eid is null then
 insert into public.tournament_events(tournament_id,name,sport,format,results_note)
 values(tid,'Шатар · Эрэгтэй','chess','other','Эцсийн байр, оноог албан дүнгээс оруулсан. 2-р өргийн зураг дутуу: нийт 54 тоглолтын дэлгэрэнгүй байна. Тэмцээн болсон огноо баталгаажаагүй.') returning id into eid;
 elsif (select sport from public.tournament_events where id=eid)<>'chess' then raise exception 'Existing event sport differs';
 end if;
 for r in select * from (values
('Балжинням Х','ЦСҮГ',1,7),
('Ганбат З','ЦСҮГ',2,5),
('Цэрэнтогтох А','ТҮГ',3,5),
('Дорждэрэм Б','ЦСҮГ',4,4.5),
('Эрдэнэбаяр Б','УУГ',5,4.5),
('Ганзориг Б','Оффис',6,4),
('Бат-Өлзийт Т','ТҮГ',7,4),
('Цэндсүрэн М','УУГ',8,4),
('Шийрэвдамба Л','ЦСҮГ',9,4),
('Золжаргал Н','ЦСҮГ',10,3),
('Эрдэнэбат У','УУГ',11,3),
('Эрдэнэ-Очир Д','ТҮГ',12,3),
('Төрбат Н','ТҮГ',13,3),
('Баярбадрал Х','ТҮГ',14,3),
('Батхишиг С','Оффис',15,2),
('Батболд С','УУГ',16,2),
('Ганбаатар З','УУГ',17,1),
('Баярсайхан Б','ЦСҮГ',18,1)
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
('Балжинням Х','Золжаргал Н','1-р өрөг · 1-р ширээ',1,0),
('Батхишиг С','Батболд С','1-р өрөг · 2-р ширээ',1,0),
('Бат-Өлзийт Т','Төрбат Н','1-р өрөг · 3-р ширээ',1,0),
('Цэндсүрэн М','Баярбадрал Х','1-р өрөг · 4-р ширээ',1,0),
('Баярсайхан Б','Цэрэнтогтох А','1-р өрөг · 5-р ширээ',0,1),
('Шийрэвдамба Л','Ганбаатар З','1-р өрөг · 6-р ширээ',1,0),
('Ганбат З','Эрдэнэбат У','1-р өрөг · 7-р ширээ',1,0),
('Эрдэнэбаяр Б','Ганзориг Б','1-р өрөг · 8-р ширээ',0,1),
('Дорждэрэм Б','Эрдэнэ-Очир Д','1-р өрөг · 9-р ширээ',1,0),
('Балжинням Х','Ганзориг Б','3-р өрөг · 1-р ширээ',1,0),
('Бат-Өлзийт Т','Шийрэвдамба Л','3-р өрөг · 2-р ширээ',1,0),
('Ганбат З','Дорждэрэм Б','3-р өрөг · 3-р ширээ',1,0),
('Цэндсүрэн М','Золжаргал Н','3-р өрөг · 4-р ширээ',1,0),
('Эрдэнэбаяр Б','Батхишиг С','3-р өрөг · 5-р ширээ',1,0),
('Төрбат Н','Цэрэнтогтох А','3-р өрөг · 6-р ширээ',0,1),
('Баярбадрал Х','Эрдэнэбат У','3-р өрөг · 7-р ширээ',1,0),
('Эрдэнэ-Очир Д','Батболд С','3-р өрөг · 8-р ширээ',1,0),
('Баярсайхан Б','Ганбаатар З','3-р өрөг · 9-р ширээ',0,1),
('Ганбат З','Балжинням Х','4-р өрөг · 1-р ширээ',0,1),
('Ганзориг Б','Бат-Өлзийт Т','4-р өрөг · 2-р ширээ',1,0),
('Шийрэвдамба Л','Цэндсүрэн М','4-р өрөг · 3-р ширээ',1,0),
('Цэрэнтогтох А','Эрдэнэбаяр Б','4-р өрөг · 4-р ширээ',1,0),
('Эрдэнэ-Очир Д','Баярбадрал Х','4-р өрөг · 5-р ширээ',1,0),
('Ганбаатар З','Батхишиг С','4-р өрөг · 6-р ширээ',0,1),
('Төрбат Н','Дорждэрэм Б','4-р өрөг · 7-р ширээ',0,1),
('Золжаргал Н','Эрдэнэбат У','4-р өрөг · 8-р ширээ',0,1),
('Батболд С','Баярсайхан Б','4-р өрөг · 9-р ширээ',1,0),
('Балжинням Х','Цэрэнтогтох А','5-р өрөг · 1-р ширээ',1,0),
('Бат-Өлзийт Т','Ганбат З','5-р өрөг · 2-р ширээ',0,1),
('Шийрэвдамба Л','Ганзориг Б','5-р өрөг · 3-р ширээ',0,1),
('Дорждэрэм Б','Эрдэнэбаяр Б','5-р өрөг · 4-р ширээ',0.5,0.5),
('Батхишиг С','Эрдэнэ-Очир Д','5-р өрөг · 5-р ширээ',0,1),
('Эрдэнэбат У','Цэндсүрэн М','5-р өрөг · 6-р ширээ',0,1),
('Ганбаатар З','Батболд С','5-р өрөг · 7-р ширээ',0,1),
('Баярбадрал Х','Золжаргал Н','5-р өрөг · 8-р ширээ',0,1),
('Баярсайхан Б','Төрбат Н','5-р өрөг · 9-р ширээ',1,0),
('Цэндсүрэн М','Балжинням Х','6-р өрөг · 1-р ширээ',0,1),
('Ганзориг Б','Ганбат З','6-р өрөг · 2-р ширээ',0,1),
('Эрдэнэ-Очир Д','Бат-Өлзийт Т','6-р өрөг · 3-р ширээ',0,1),
('Цэрэнтогтох А','Шийрэвдамба Л','6-р өрөг · 4-р ширээ',1,0),
('Батболд С','Дорждэрэм Б','6-р өрөг · 5-р ширээ',0,1),
('Эрдэнэбаяр Б','Золжаргал Н','6-р өрөг · 6-р ширээ',1,0),
('Эрдэнэбат У','Батхишиг С','6-р өрөг · 7-р ширээ',1,0),
('Баярсайхан Б','Баярбадрал Х','6-р өрөг · 8-р ширээ',0,1),
('Төрбат Н','Ганбаатар З','6-р өрөг · 9-р ширээ',1,0),
('Балжинням Х','Бат-Өлзийт Т','7-р өрөг · 1-р ширээ',1,0),
('Ганбат З','Эрдэнэбаяр Б','7-р өрөг · 2-р ширээ',0,1),
('Цэрэнтогтох А','Ганзориг Б','7-р өрөг · 3-р ширээ',1,0),
('Дорждэрэм Б','Эрдэнэбат У','7-р өрөг · 4-р ширээ',1,0),
('Шийрэвдамба Л','Эрдэнэ-Очир Д','7-р өрөг · 5-р ширээ',1,0),
('Батхишиг С','Цэндсүрэн М','7-р өрөг · 6-р ширээ',0,1),
('Батболд С','Төрбат Н','7-р өрөг · 7-р ширээ',0,1),
('Баярбадрал Х','Ганбаатар З','7-р өрөг · 8-р ширээ',1,0),
('Золжаргал Н','Баярсайхан Б','7-р өрөг · 9-р ширээ',1,0)
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
where lower(u.email)='admin@gmail.com' and lower(t.name)='buuruljuutcup2026' and e.name='Шатар · Эрэгтэй';
