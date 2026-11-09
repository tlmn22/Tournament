-- BodiGames 2026 / Шатар — Final ranking (9 баг), 2026-11-09-нд ирсэн зургаас.
-- Supabase project: kkdelcsvtgwfwzhkjiuo. Эхлээд migrations/202611090002_team_result_details.sql-ийг ажиллуулна.
-- Өглөө оруулсан буруу хэсэг (A–D, 16 баг) болон 24 тоглолтыг устгаад, эцсийн байрыг шинээр оруулна.
-- Тоглолт бүрийн мэдээлэл байхгүй тул тоглолт үүсгэхгүй.
-- Хадгална: Шатар ангилал, компаниуд, компанийн оноо (Багийн дүн), бусад спорт.
-- Нэг transaction; алдаа гарвал юу ч өөрчлөгдөхгүй. Дахин ажиллуулахад ижил үр дүн гарна.
begin;
do $import_chess_ranking$
declare
  target_tournament constant uuid := '0e3589a1-23d2-46de-bbae-a5e3a0baf1b2';
  target_event constant uuid := '33ed3b6b-d6ab-4b53-b435-90cb7a86490a';
  ranking constant jsonb := $ranking$[
    {"rank":1,"name":"Цэцэнс Майнинг энд энержи ХХК 1-р баг","company_id":"c2f619c3-56b5-406e-9fe4-47bffdbadeb8","games":7,"wins":6,"draws":0,"losses":1,"mp":12,"points":26,"ede":0,"bh_gp":131},
    {"rank":2,"name":"Цэцэнс Майнинг энд энержи ХХК 2-р баг","company_id":"c2f619c3-56b5-406e-9fe4-47bffdbadeb8","games":6,"wins":4,"draws":1,"losses":1,"mp":11,"points":23.5,"ede":0,"bh_gp":146},
    {"rank":3,"name":"Мандал Ресурс ХХК","company_id":"ff400def-8991-4423-9869-2bd2d003dd86","games":7,"wins":5,"draws":0,"losses":2,"mp":10,"points":24,"ede":1,"bh_gp":132.5},
    {"rank":4,"name":"Бодь Интернэшнл ХХК","company_id":"897e8c50-55cd-4ebd-984f-e939a8896ddc","games":6,"wins":4,"draws":0,"losses":2,"mp":10,"points":24,"ede":2,"bh_gp":142.5},
    {"rank":5,"name":"\"Бодь Пропертийз\"","company_id":"574eaa23-5510-4320-bf42-efa9641d5a94","games":6,"wins":3,"draws":0,"losses":3,"mp":8,"points":15,"ede":0,"bh_gp":133},
    {"rank":6,"name":"УСАХ ХХК","company_id":"8cee6250-cc8e-4d95-9ae0-0728269a1211","games":6,"wins":2,"draws":1,"losses":3,"mp":7,"points":16.5,"ede":0,"bh_gp":139.5},
    {"rank":7,"name":"Рэд рок холдинг ХХК","company_id":"9cde3664-86d5-431c-9d57-cb4e0c3c73eb","games":6,"wins":2,"draws":0,"losses":4,"mp":6,"points":17.5,"ede":0,"bh_gp":126.5},
    {"rank":8,"name":"Бодь Рэйл ХХК","company_id":"295d0eb4-5999-447c-86b0-7c0eee3d4109","games":6,"wins":1,"draws":0,"losses":5,"mp":4,"points":17,"ede":0,"bh_gp":133},
    {"rank":9,"name":"ИНкон","company_id":"c3746f7a-7b41-451b-8af0-cdb79faa96b1","games":6,"wins":0,"draws":0,"losses":6,"mp":2,"points":10.5,"ede":0,"bh_gp":134}
  ]$ranking$::jsonb;
  fixtures_deleted integer;
  teams_deleted integer;
begin
  perform set_config('lock_timeout','5s',true);
  if not exists (select 1 from public.tournaments where id=target_tournament and name='BodiGames 2026') then
    raise exception 'Expected BodiGames 2026 tournament was not found. No data changed.';
  end if;
  perform 1 from public.tournament_events where id=target_event and tournament_id=target_tournament and name='Шатар' and sport='chess' for update;
  if not found then raise exception 'Expected chess category was not found. No data changed.'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='result_details') then
    raise exception 'Run migrations/202611090002_team_result_details.sql first. No data changed.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(ranking) as r(company_id uuid)
    left join public.companies c on c.id=r.company_id and c.tournament_id=target_tournament where c.id is null
  ) then raise exception 'A required company is missing or belongs to another tournament. No data changed.'; end if;

  delete from public.tournament_fixtures where tournament_event_id=target_event;
  get diagnostics fixtures_deleted = row_count;
  delete from public.teams where tournament_event_id=target_event;
  get diagnostics teams_deleted = row_count;

  insert into public.teams (tournament_event_id,company_id,name,final_place,result_points,result_details,created_at)
  select target_event, r.company_id, r.name, r.rank, r.points,
    jsonb_build_object('games',r.games,'wins',r.wins,'draws',r.draws,'losses',r.losses,'mp',r.mp,'ede',r.ede,'bh_gp',r.bh_gp),
    statement_timestamp() + r.rank * interval '1 millisecond'
  from jsonb_to_recordset(ranking) as r(rank integer,name text,company_id uuid,games integer,wins integer,draws integer,losses integer,mp integer,points numeric,ede integer,bh_gp numeric);

  raise notice 'Removed % fixtures and % teams; imported 9 ranked chess teams.',fixtures_deleted,teams_deleted;
end $import_chess_ranking$;

-- Шалгах: зурагтай тулгана.
select t.final_place as rank, t.name as team, t.result_details->>'games' as gam, t.result_details->>'wins' as "+",
  t.result_details->>'draws' as "=", t.result_details->>'losses' as "-", t.result_details->>'mp' as mp,
  t.result_points as pts, t.result_details->>'ede' as ede, t.result_details->>'bh_gp' as bh_gp, c.name as company
from public.teams t left join public.companies c on c.id=t.company_id
where t.tournament_event_id='33ed3b6b-d6ab-4b53-b435-90cb7a86490a'
order by t.final_place;
commit;
