import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const d=JSON.parse(await readFile("chess/men/results-transcribed.json","utf8"));
assert.equal(d.standings.length,18);
assert.equal(d.games.length,54);
assert.equal(new Set(d.games.map(g=>g.round+":"+g.board)).size,54);
for(const p of d.standings) {
 const played=d.games.filter(g=>g.white_start_number===p.start_number||g.black_start_number===p.start_number);
 assert.equal(played.length,6);
 const subtotal=played.reduce((sum,g)=>sum+(g.white_start_number===p.start_number?g.white_score:g.black_score),0);
 assert.ok([0,.5,1].includes(p.points-subtotal),p.name+" final points conflict with known rounds");
}
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; insert into auth.users values ('11111111-1111-4111-8111-111111111111','admin@gmail.com');`);
await db.exec(await readFile("supabase/migrations/202610220001_tournament_workspace.sql","utf8"));
await db.exec("alter table public.tournament_events add constraint tournament_events_sport_check check (sport in ('basketball','volleyball','football','esports','other','legacy_sport'))");
const sql=await readFile("supabase/seeds/buuruljuutcup2026_chess_men.sql","utf8");
await db.exec(sql);
await db.exec(sql);
const count=async t=>Number((await db.query("select count(*) n from "+t)).rows[0].n);
assert.equal(await count("companies"),4);
assert.equal(await count("tournament_events"),1);
assert.equal(await count("teams"),18);
assert.equal(await count("tournament_fixtures"),54);
assert.equal((await db.query("select count(*) n from tournament_fixtures where home_score=.5 and away_score=.5")).rows[0].n,1);
assert.equal(Number((await db.query("select sum(result_points) p from teams")).rows[0].p),63);


const women=JSON.parse(await readFile("chess/woman/results-transcribed.json","utf8"));
assert.equal(women.standings.length,8);
assert.equal(women.games.length,28);
assert.equal(new Set(women.games.map(g=>[g.white_start_number,g.black_start_number].sort((a,b)=>a-b).join(":"))).size,28);
for(const player of women.standings){
 const games=women.games.filter(g=>g.white_start_number===player.start_number||g.black_start_number===player.start_number);
 assert.equal(games.length,7);
 assert.equal(games.reduce((n,g)=>n+(g.white_start_number===player.start_number?g.white_score:g.black_score),0),player.points,player.name);
}
const before=(await db.query("select row_to_json(f) r from tournament_fixtures f order by id")).rows;
const womenSql=await readFile("supabase/seeds/buuruljuutcup2026_chess_women.sql","utf8");
await db.exec(womenSql);
await db.exec(womenSql);
assert.equal(await count("companies"),4);
assert.equal(await count("tournament_events"),2);
assert.equal(await count("teams"),26);
assert.equal(await count("tournament_fixtures"),82);
const female=(await db.query("select id from tournament_events where name='Шатар · Эмэгтэй'")).rows[0].id;
const male=(await db.query("select id from tournament_events where name='Шатар · Эрэгтэй'")).rows[0].id;
assert.deepEqual((await db.query("select row_to_json(f) r from tournament_fixtures f where tournament_event_id=$1 order by id",[male])).rows,before);
assert.equal(Number((await db.query("select sum(result_points) p from teams where tournament_event_id=$1",[female])).rows[0].p),28);
assert.equal((await db.query("select home_score from tournament_fixtures where tournament_event_id=$1 and round='1-р өрөг · 2-р ширээ'",[female])).rows[0].home_score,"1");
console.log("PASS: women's 8 final places, all 28 games, all totals agree, user correction, repeated import no duplicates, men's games unchanged.");

const parent=(await db.query("select tournament_id from tournament_events limit 1")).rows[0].tournament_id;
for(const sport of ["checkers","darts","legacy_sport"]) {
 const added=await db.query("insert into tournament_events(tournament_id,name,sport,format) values ($1,$2,$2,'other') returning id",[parent,sport]);
 await db.query("delete from tournament_events where id=$1",[added.rows[0].id]);
}
await assert.rejects(db.query("insert into tournament_events(tournament_id,name,sport,format) values ($1,'Bad','unsupported','other')",[parent]),/tournament_events_sport_check/);
await db.exec("update tournament_fixtures set home_score=9 where round='1-р өрөг · 1-р ширээ'");
await assert.rejects(db.exec(sql),/Conflicting game/);
await db.exec("rollback");
console.log("PASS: legacy sport constraint extended, old allowed sports preserved, unknown sports rejected; 18 standings, 54 games, six evidenced rounds, points consistency, half-point draw, four organizations, repeat import without duplicates, conflicts abort.");
await db.close();
