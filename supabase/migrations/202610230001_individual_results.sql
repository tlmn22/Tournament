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
