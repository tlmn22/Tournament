-- BodiGames 2026 / Шатар: screenshot groups A1-D4, supplied 2026-11-09.
-- Target Supabase project: kkdelcsvtgwfwzhkjiuo.
-- Inserts 16 teams into the existing, empty chess category. Creates no fixtures.
-- Existing companies, other sports, results, and scores are preserved.
-- Safe to rerun; unexpected existing teams or changed grouping abort the transaction.
begin;
set local lock_timeout = '5s';
create temporary table bodi_chess_import (
  ordinal integer primary key, id uuid unique not null, code text unique not null,
  group_name text not null, name text not null, company_id uuid not null
) on commit drop;
insert into bodi_chess_import (ordinal,id,code,group_name,name,company_id) values
  (1, '633518f5-abb0-a63d-0af6-0a1e6e8a4b11', 'A1', 'A', 'Бодь пропертийз - 1', '574eaa23-5510-4320-bf42-efa9641d5a94'),
  (2, '43023697-c820-be84-a83c-4d732393bce8', 'A2', 'A', 'Цэцэнс - 1', 'c2f619c3-56b5-406e-9fe4-47bffdbadeb8'),
  (3, '0afa8aad-c542-bb33-53a6-07f1a5ea758c', 'A3', 'A', 'Цэцэнс - 2', 'c2f619c3-56b5-406e-9fe4-47bffdbadeb8'),
  (4, 'fc65f9f3-3ca6-acdc-ba58-957a88b6c378', 'A4', 'A', 'Бодь пропертийз - 2', '574eaa23-5510-4320-bf42-efa9641d5a94'),
  (5, '0a86e4d1-2856-61de-e560-843a26e64079', 'B1', 'B', 'Ред рок - 1', '9cde3664-86d5-431c-9d57-cb4e0c3c73eb'),
  (6, '08f9ec51-2de5-1494-b155-1f9edd02c225', 'B2', 'B', 'Мандал - 2', 'ff400def-8991-4423-9869-2bd2d003dd86'),
  (7, '9bf7a1ca-20ad-6586-05f2-55fe0e29d9b1', 'B3', 'B', 'Мандал - 1', 'ff400def-8991-4423-9869-2bd2d003dd86'),
  (8, 'd28316cf-872e-229c-86e2-a58f25e27c52', 'B4', 'B', 'Ред рок - 2', '9cde3664-86d5-431c-9d57-cb4e0c3c73eb'),
  (9, '818f8e41-a75b-d898-9384-202538444681', 'C1', 'C', 'Инкон - 1', 'c3746f7a-7b41-451b-8af0-cdb79faa96b1'),
  (10, 'cfb31c6a-c1bf-571a-a276-e0cfd15043a2', 'C2', 'C', 'Бодь рейл', '295d0eb4-5999-447c-86b0-7c0eee3d4109'),
  (11, '7d0baed8-e27a-6db6-e282-5552b58b66d4', 'C3', 'C', 'Бодь интернэшнл - 1', '897e8c50-55cd-4ebd-984f-e939a8896ddc'),
  (12, '65819147-3953-3508-b827-2f4219669efc', 'C4', 'C', 'Мэйджор Саплай', 'd1dc1367-5135-4bd1-85aa-ef305a788356'),
  (13, '70356600-bf29-d036-7d20-ab5c6395032e', 'D1', 'D', 'Бодь интернэшнл - 2', '897e8c50-55cd-4ebd-984f-e939a8896ddc'),
  (14, '39ba64c7-0c30-80cb-2449-a4f0f3b73093', 'D2', 'D', 'УСАХ - 2', '8cee6250-cc8e-4d95-9ae0-0728269a1211'),
  (15, '205669df-aafe-922a-40ad-f99c11104e01', 'D3', 'D', 'Инкон - 2', 'c3746f7a-7b41-451b-8af0-cdb79faa96b1'),
  (16, '6f8e9f3b-0e15-cf2a-f64c-03cdbdbc62e7', 'D4', 'D', 'УСАХ - 1', '8cee6250-cc8e-4d95-9ae0-0728269a1211');

do $$
declare
  target_tournament constant uuid := '0e3589a1-23d2-46de-bbae-a5e3a0baf1b2';
  target_event constant uuid := '33ed3b6b-d6ab-4b53-b435-90cb7a86490a';
begin
  if not exists (select 1 from public.tournaments where id = target_tournament and name = 'BodiGames 2026') then
    raise exception 'Expected BodiGames 2026 tournament was not found. No data changed.';
  end if;
  perform 1 from public.tournament_events where id = target_event and tournament_id = target_tournament and name = 'Шатар' and sport = 'chess' for update;
  if not found then raise exception 'Expected chess category was not found. No data changed.'; end if;
  if exists (select 1 from bodi_chess_import i left join public.companies c on c.id = i.company_id and c.tournament_id = target_tournament where c.id is null) then
    raise exception 'A required company is missing or belongs to another tournament. No data changed.';
  end if;
  if exists (
    select 1 from public.teams t left join bodi_chess_import i on i.id = t.id
    where t.tournament_event_id = target_event
      and (i.id is null or t.name is distinct from i.name or t.company_id is distinct from i.company_id or t.group_name is distinct from i.group_name)
  ) then raise exception 'Chess teams already exist with a different setup. Review them before importing; no data changed.'; end if;
  if exists (select 1 from public.teams t join bodi_chess_import i on i.id = t.id where t.tournament_event_id <> target_event) then
    raise exception 'An import ID is used by another category. No data changed.';
  end if;

  insert into public.teams (id,tournament_event_id,company_id,name,group_name,created_at)
  select id,target_event,company_id,name,group_name,statement_timestamp() + ordinal * interval '1 millisecond'
  from bodi_chess_import order by ordinal
  on conflict (id) do nothing;

  if (select count(*) from public.teams where tournament_event_id = target_event) <> 16 then
    raise exception 'Expected exactly 16 chess teams. Transaction rolled back.';
  end if;
  if exists (select group_name from public.teams where tournament_event_id = target_event group by group_name having count(*) <> 4) then
    raise exception 'Expected four teams in each group. Transaction rolled back.';
  end if;
end $$;

select i.code, t.name as team_name, t.group_name, c.name as company_name
from bodi_chess_import i join public.teams t on t.id = i.id join public.companies c on c.id = t.company_id
order by i.ordinal;
commit;
