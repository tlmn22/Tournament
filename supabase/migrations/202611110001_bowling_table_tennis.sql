begin;
-- Allow bowling and table tennis events while keeping the existing sport rule.
do $sports$
declare previous_rule text;
begin
 select pg_get_expr(conbin, conrelid) into previous_rule
 from pg_constraint
 where conrelid='public.tournament_events'::regclass
   and conname='tournament_events_sport_check' and contype='c';
 if previous_rule is not null and previous_rule not like '%table_tennis%' then
   alter table public.tournament_events drop constraint tournament_events_sport_check;
   execute format(
     'alter table public.tournament_events add constraint tournament_events_sport_check check ((%s) or sport in (''bowling'',''table_tennis''))',
     previous_rule
   );
 end if;
end $sports$;
commit;
