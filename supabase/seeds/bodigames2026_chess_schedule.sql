-- BodiGames 2026 / Шатар — зурагт өгсөн 24 тоглолт.
-- Supabase project: kkdelcsvtgwfwzhkjiuo. Файлыг бүтнээр нь хуулж Run хийнэ.
-- A/B: 1,3,5-р ээлж; C/D: 2,4,6-р ээлж. Хэсэг бүр 3 раунд, 6 тоглолт.
-- Түр хүснэгт ашиглахгүй. DO блок бүх тоглолтыг нэг transaction-оор хадгална.
-- Оноо хоосон, төлөв scheduled. Огноо/цаг болон талбай зурагт байхгүй тул оруулахгүй.
-- Дахин ажиллуулахад давхардал үүсэхгүй; өмнөх оноо/үр дүнг өөрчлөхгүй.
do $import_chess_schedule$
declare
  target_tournament constant uuid := '0e3589a1-23d2-46de-bbae-a5e3a0baf1b2';
  target_event constant uuid := '33ed3b6b-d6ab-4b53-b435-90cb7a86490a';
  expected_teams constant jsonb := $teams$[
    {"id":"633518f5-abb0-a63d-0af6-0a1e6e8a4b11","name":"Бодь пропертийз - 1","group_name":"A","company_id":"574eaa23-5510-4320-bf42-efa9641d5a94"},
    {"id":"43023697-c820-be84-a83c-4d732393bce8","name":"Цэцэнс - 1","group_name":"A","company_id":"c2f619c3-56b5-406e-9fe4-47bffdbadeb8"},
    {"id":"0afa8aad-c542-bb33-53a6-07f1a5ea758c","name":"Цэцэнс - 2","group_name":"A","company_id":"c2f619c3-56b5-406e-9fe4-47bffdbadeb8"},
    {"id":"fc65f9f3-3ca6-acdc-ba58-957a88b6c378","name":"Бодь пропертийз - 2","group_name":"A","company_id":"574eaa23-5510-4320-bf42-efa9641d5a94"},
    {"id":"0a86e4d1-2856-61de-e560-843a26e64079","name":"Ред рок - 1","group_name":"B","company_id":"9cde3664-86d5-431c-9d57-cb4e0c3c73eb"},
    {"id":"08f9ec51-2de5-1494-b155-1f9edd02c225","name":"Мандал - 2","group_name":"B","company_id":"ff400def-8991-4423-9869-2bd2d003dd86"},
    {"id":"9bf7a1ca-20ad-6586-05f2-55fe0e29d9b1","name":"Мандал - 1","group_name":"B","company_id":"ff400def-8991-4423-9869-2bd2d003dd86"},
    {"id":"d28316cf-872e-229c-86e2-a58f25e27c52","name":"Ред рок - 2","group_name":"B","company_id":"9cde3664-86d5-431c-9d57-cb4e0c3c73eb"},
    {"id":"818f8e41-a75b-d898-9384-202538444681","name":"Инкон - 1","group_name":"C","company_id":"c3746f7a-7b41-451b-8af0-cdb79faa96b1"},
    {"id":"cfb31c6a-c1bf-571a-a276-e0cfd15043a2","name":"Бодь рейл","group_name":"C","company_id":"295d0eb4-5999-447c-86b0-7c0eee3d4109"},
    {"id":"7d0baed8-e27a-6db6-e282-5552b58b66d4","name":"Бодь интернэшнл - 1","group_name":"C","company_id":"897e8c50-55cd-4ebd-984f-e939a8896ddc"},
    {"id":"65819147-3953-3508-b827-2f4219669efc","name":"Мэйджор Саплай","group_name":"C","company_id":"d1dc1367-5135-4bd1-85aa-ef305a788356"},
    {"id":"70356600-bf29-d036-7d20-ab5c6395032e","name":"Бодь интернэшнл - 2","group_name":"D","company_id":"897e8c50-55cd-4ebd-984f-e939a8896ddc"},
    {"id":"39ba64c7-0c30-80cb-2449-a4f0f3b73093","name":"УСАХ - 2","group_name":"D","company_id":"8cee6250-cc8e-4d95-9ae0-0728269a1211"},
    {"id":"205669df-aafe-922a-40ad-f99c11104e01","name":"Инкон - 2","group_name":"D","company_id":"c3746f7a-7b41-451b-8af0-cdb79faa96b1"},
    {"id":"6f8e9f3b-0e15-cf2a-f64c-03cdbdbc62e7","name":"УСАХ - 1","group_name":"D","company_id":"8cee6250-cc8e-4d95-9ae0-0728269a1211"}
  ]$teams$::jsonb;
  expected_matches constant jsonb := $matches$[
    {"id":"e21be9d2-18b0-87ac-ad57-48f446c277aa","ordinal":1,"home_team_id":"633518f5-abb0-a63d-0af6-0a1e6e8a4b11","away_team_id":"fc65f9f3-3ca6-acdc-ba58-957a88b6c378","round":"1-р ээлж · A хэсэг · 1-р раунд"},
    {"id":"3af9e70c-5135-86e8-ac78-205513e09336","ordinal":2,"home_team_id":"43023697-c820-be84-a83c-4d732393bce8","away_team_id":"0afa8aad-c542-bb33-53a6-07f1a5ea758c","round":"1-р ээлж · A хэсэг · 1-р раунд"},
    {"id":"fc6224c7-8494-8463-9d11-b64ea103e5f0","ordinal":3,"home_team_id":"0a86e4d1-2856-61de-e560-843a26e64079","away_team_id":"d28316cf-872e-229c-86e2-a58f25e27c52","round":"1-р ээлж · B хэсэг · 1-р раунд"},
    {"id":"22db965c-9a4c-88d7-979c-89c0796e94f9","ordinal":4,"home_team_id":"08f9ec51-2de5-1494-b155-1f9edd02c225","away_team_id":"9bf7a1ca-20ad-6586-05f2-55fe0e29d9b1","round":"1-р ээлж · B хэсэг · 1-р раунд"},
    {"id":"ce2c7838-dc87-8319-be16-a93c3f441ab2","ordinal":5,"home_team_id":"818f8e41-a75b-d898-9384-202538444681","away_team_id":"65819147-3953-3508-b827-2f4219669efc","round":"2-р ээлж · C хэсэг · 1-р раунд"},
    {"id":"f7cf5c81-475d-8173-9a13-95b4f4edb575","ordinal":6,"home_team_id":"cfb31c6a-c1bf-571a-a276-e0cfd15043a2","away_team_id":"7d0baed8-e27a-6db6-e282-5552b58b66d4","round":"2-р ээлж · C хэсэг · 1-р раунд"},
    {"id":"4d8d9ef6-63a8-86be-9fd6-3cb03848c6bf","ordinal":7,"home_team_id":"6f8e9f3b-0e15-cf2a-f64c-03cdbdbc62e7","away_team_id":"39ba64c7-0c30-80cb-2449-a4f0f3b73093","round":"2-р ээлж · D хэсэг · 1-р раунд"},
    {"id":"92d195db-2155-866e-8c42-613635c31f5f","ordinal":8,"home_team_id":"70356600-bf29-d036-7d20-ab5c6395032e","away_team_id":"205669df-aafe-922a-40ad-f99c11104e01","round":"2-р ээлж · D хэсэг · 1-р раунд"},
    {"id":"d2a868bb-3ebc-8f66-bc3e-99be5f178ecb","ordinal":9,"home_team_id":"633518f5-abb0-a63d-0af6-0a1e6e8a4b11","away_team_id":"0afa8aad-c542-bb33-53a6-07f1a5ea758c","round":"3-р ээлж · A хэсэг · 2-р раунд"},
    {"id":"d1c81ff2-cd58-864c-a3e4-0b975272160c","ordinal":10,"home_team_id":"fc65f9f3-3ca6-acdc-ba58-957a88b6c378","away_team_id":"43023697-c820-be84-a83c-4d732393bce8","round":"3-р ээлж · A хэсэг · 2-р раунд"},
    {"id":"e85a3946-dac9-8e37-901c-9eb9570e6bf9","ordinal":11,"home_team_id":"0a86e4d1-2856-61de-e560-843a26e64079","away_team_id":"9bf7a1ca-20ad-6586-05f2-55fe0e29d9b1","round":"3-р ээлж · B хэсэг · 2-р раунд"},
    {"id":"d8dda6d8-a4cc-882f-a963-d668aa787eb9","ordinal":12,"home_team_id":"d28316cf-872e-229c-86e2-a58f25e27c52","away_team_id":"08f9ec51-2de5-1494-b155-1f9edd02c225","round":"3-р ээлж · B хэсэг · 2-р раунд"},
    {"id":"6d67104b-2836-8c9a-b774-25b19d4f3289","ordinal":13,"home_team_id":"818f8e41-a75b-d898-9384-202538444681","away_team_id":"7d0baed8-e27a-6db6-e282-5552b58b66d4","round":"4-р ээлж · C хэсэг · 2-р раунд"},
    {"id":"f0770a25-114b-8800-b80a-22791b95a3f9","ordinal":14,"home_team_id":"65819147-3953-3508-b827-2f4219669efc","away_team_id":"cfb31c6a-c1bf-571a-a276-e0cfd15043a2","round":"4-р ээлж · C хэсэг · 2-р раунд"},
    {"id":"f7ec9fad-14dc-83a2-b6a4-305c1a88d41c","ordinal":15,"home_team_id":"39ba64c7-0c30-80cb-2449-a4f0f3b73093","away_team_id":"205669df-aafe-922a-40ad-f99c11104e01","round":"4-р ээлж · D хэсэг · 2-р раунд"},
    {"id":"ef2d4216-768b-833c-b0bf-3eae4226a918","ordinal":16,"home_team_id":"70356600-bf29-d036-7d20-ab5c6395032e","away_team_id":"6f8e9f3b-0e15-cf2a-f64c-03cdbdbc62e7","round":"4-р ээлж · D хэсэг · 2-р раунд"},
    {"id":"131f8ff6-50e3-8ecd-acb5-90795252cba3","ordinal":17,"home_team_id":"633518f5-abb0-a63d-0af6-0a1e6e8a4b11","away_team_id":"43023697-c820-be84-a83c-4d732393bce8","round":"5-р ээлж · A хэсэг · 3-р раунд"},
    {"id":"b67f3404-5980-847b-ac5f-8142bd8689cb","ordinal":18,"home_team_id":"0afa8aad-c542-bb33-53a6-07f1a5ea758c","away_team_id":"fc65f9f3-3ca6-acdc-ba58-957a88b6c378","round":"5-р ээлж · A хэсэг · 3-р раунд"},
    {"id":"3393c2a4-a4c1-81bb-9b95-5719c343f89e","ordinal":19,"home_team_id":"0a86e4d1-2856-61de-e560-843a26e64079","away_team_id":"08f9ec51-2de5-1494-b155-1f9edd02c225","round":"5-р ээлж · B хэсэг · 3-р раунд"},
    {"id":"a2832282-0fee-8ec1-9454-56f2d98b810f","ordinal":20,"home_team_id":"9bf7a1ca-20ad-6586-05f2-55fe0e29d9b1","away_team_id":"d28316cf-872e-229c-86e2-a58f25e27c52","round":"5-р ээлж · B хэсэг · 3-р раунд"},
    {"id":"801dd6d4-45af-8ab0-ac2a-4530d654e2e4","ordinal":21,"home_team_id":"818f8e41-a75b-d898-9384-202538444681","away_team_id":"cfb31c6a-c1bf-571a-a276-e0cfd15043a2","round":"6-р ээлж · C хэсэг · 3-р раунд"},
    {"id":"f56a635e-3610-8cb9-a903-f6a7bd2ee32b","ordinal":22,"home_team_id":"7d0baed8-e27a-6db6-e282-5552b58b66d4","away_team_id":"65819147-3953-3508-b827-2f4219669efc","round":"6-р ээлж · C хэсэг · 3-р раунд"},
    {"id":"9d4b4aca-874d-809f-ac25-e08ed46a1e7b","ordinal":23,"home_team_id":"70356600-bf29-d036-7d20-ab5c6395032e","away_team_id":"39ba64c7-0c30-80cb-2449-a4f0f3b73093","round":"6-р ээлж · D хэсэг · 3-р раунд"},
    {"id":"2d004d3b-0cbd-892b-ac92-1d7ac7a274cf","ordinal":24,"home_team_id":"205669df-aafe-922a-40ad-f99c11104e01","away_team_id":"6f8e9f3b-0e15-cf2a-f64c-03cdbdbc62e7","round":"6-р ээлж · D хэсэг · 3-р раунд"}
  ]$matches$::jsonb;
  planned record;
  matching_ids uuid[];
  existing public.tournament_fixtures%rowtype;
  created_count integer := 0;
begin
  perform set_config('lock_timeout','5s',true);
  if not exists (select 1 from public.tournaments where id=target_tournament and name='BodiGames 2026') then
    raise exception 'Expected BodiGames 2026 tournament was not found. No data changed.';
  end if;
  perform 1 from public.tournament_events where id=target_event and tournament_id=target_tournament and name='Шатар' and sport='chess' for update;
  if not found then raise exception 'Expected chess category was not found. No data changed.'; end if;
  if (select count(*) from public.teams where tournament_event_id=target_event) <> 16 then
    raise exception 'Expected exactly 16 chess teams. No data changed.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(expected_teams) as i(id uuid,name text,group_name text,company_id uuid)
    left join public.teams t on t.id=i.id and t.tournament_event_id=target_event
    where t.id is null or t.name is distinct from i.name or t.group_name is distinct from i.group_name or t.company_id is distinct from i.company_id
  ) then raise exception 'Chess team names, groups or companies have changed. Review the schedule first; no data changed.'; end if;

  for planned in
    select * from jsonb_to_recordset(expected_matches) as i(id uuid,ordinal integer,home_team_id uuid,away_team_id uuid,round text) order by ordinal
  loop
    select array_agg(f.id) into matching_ids from public.tournament_fixtures f
    where f.tournament_event_id=target_event and (
      (f.home_team_id=planned.home_team_id and f.away_team_id=planned.away_team_id) or
      (f.home_team_id=planned.away_team_id and f.away_team_id=planned.home_team_id)
    );
    if coalesce(cardinality(matching_ids),0) > 1 then
      raise exception 'Duplicate existing matchup found. Review existing fixtures; no data changed.';
    elsif cardinality(matching_ids)=1 then
      select * into existing from public.tournament_fixtures where id=matching_ids[1] for update;
      if existing.home_team_id <> planned.home_team_id or existing.away_team_id <> planned.away_team_id or existing.round is distinct from planned.round then
        raise exception 'Existing matchup has a different team order or round. Review it first; no data changed.';
      end if;
      -- Same matchup already exists: preserve its ID, status, scores, time and venue.
    else
      if exists (select 1 from public.tournament_fixtures where id=planned.id) then
        raise exception 'An import ID is already used by a different fixture. No data changed.';
      end if;
      insert into public.tournament_fixtures(id,tournament_event_id,home_team_id,away_team_id,round,status,home_score,away_score,starts_at,venue,created_at)
      values(planned.id,target_event,planned.home_team_id,planned.away_team_id,planned.round,'scheduled',null,null,null,'',statement_timestamp()+planned.ordinal*interval '1 millisecond');
      created_count := created_count+1;
    end if;
  end loop;
  if (select count(*) from public.tournament_fixtures where tournament_event_id=target_event) <> 24 then
    raise exception 'Unexpected extra fixtures exist. Expected exactly 24 chess games; all inserts rolled back.';
  end if;
  raise notice 'Chess schedule ready: % new games; 24 games total.',created_count;
end $import_chess_schedule$;

-- Үр дүнг шалгах. Энэ SELECT-ийг тусад нь дахин ажиллуулж болно.
select f.round as round_label,h.name as team_1,f.home_score,a.name as team_2,f.away_score,f.status
from public.tournament_fixtures f join public.teams h on h.id=f.home_team_id join public.teams a on a.id=f.away_team_id
where f.tournament_event_id='33ed3b6b-d6ab-4b53-b435-90cb7a86490a'
order by f.round,f.created_at,f.id;
