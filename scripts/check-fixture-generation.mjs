import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { planFixtures, fixtureRows } from "../src/lib/fixture-generation.ts";

const uuid = n => "aaaaaaaa-aaaa-4aaa-8aaa-" + String(n).padStart(12, "0");
const eventId = uuid(1), otherEvent = uuid(2);
const team = (n, group = null) => ({ id: uuid(100 + n), tournament_event_id: eventId, company_id: null, name: "Баг " + n, group_name: group });
const pair = match => [match.home_team_id, match.away_team_id].sort().join("/");
function verifyRounds(plan, teams) {
  assert.equal(new Set(plan.matches.map(pair)).size, plan.matches.length, "Each pair meets once");
  const rounds = new Map();
  for (const match of plan.matches) {
    assert.notEqual(match.home_team_id, match.away_team_id);
    const used = rounds.get(match.round) || new Set();
    for (const id of [match.home_team_id, match.away_team_id]) {
      assert.ok(!used.has(id), "No team plays twice in the same round");
      used.add(id);
    }
    rounds.set(match.round, used);
  }
  for (const t of teams) {
    const opponents = teams.filter(other => other.id !== t.id && other.group_name === t.group_name);
    assert.equal(plan.matches.filter(m => [m.home_team_id, m.away_team_id].includes(t.id)).length, opponents.length);
  }
}

// Vary both even and odd fields, including the two-team boundary.
for (let size = 2; size <= 32; size++) {
  const teams = Array.from({ length: size }, (_, i) => team(i));
  const original = structuredClone(teams);
  const plan = planFixtures(eventId, teams, [], "all");
  assert.equal(plan.total, size * (size - 1) / 2);
  assert.equal(new Set(plan.matches.map(m => m.round)).size, size % 2 ? size : size - 1);
  assert.equal(plan.byes.length, size % 2 ? size : 0);
  if (size % 2) assert.equal(new Set(plan.byes.map(b => b.teamId)).size, size);
  verifyRounds(plan, teams);
  assert.deepEqual(teams, original, "Planning does not mutate teams");
  assert.deepEqual(planFixtures(eventId, [...teams].reverse(), [], "all"), plan);
}
const teams = ["A", "A", "A", "A", "B", "B", "B", "C", "C", "C", "D", "D", "D"].map((g, i) => team(i, g));
const grouped = planFixtures(eventId, teams, [], "groups");
assert.equal(grouped.matches.length, 15);
assert.equal(grouped.byes.length, 9);
verifyRounds(grouped, teams);
assert.equal(planFixtures(eventId, teams, [], "all").matches.length, 78);
for (const m of grouped.matches) assert.equal(teams.find(t => t.id === m.home_team_id).group_name, teams.find(t => t.id === m.away_team_id).group_name);
const extra = { ...team(99), tournament_event_id: otherEvent };
assert.deepEqual(planFixtures(eventId, [...teams, extra], [], "groups"), grouped);

const rows = await fixtureRows(eventId, grouped.matches, []);
assert.equal(new Set(rows.map(r => r.id)).size, 15);
assert.deepEqual(await fixtureRows(eventId, [...grouped.matches].reverse(), []), [...rows].reverse());
assert.deepEqual(await fixtureRows(eventId, grouped.matches.map(m => ({ ...m, home_team_id: m.away_team_id, away_team_id: m.home_team_id })), []).then(items => items.map(i => i.id)), rows.map(i => i.id));
assert.ok(rows.every(r => /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r.id)));
assert.ok(rows.every(r => r.status === "scheduled" && r.home_score === null && r.away_score === null && r.starts_at === null && r.venue === ""));
assert.notEqual((await fixtureRows(otherEvent, grouped.matches.slice(0, 1), []))[0].id, rows[0].id);

const scored = { ...rows[0], home_team_id: rows[0].away_team_id, away_team_id: rows[0].home_team_id, status: "completed", home_score: 48, away_score: 42 };
const before = structuredClone(scored);
const partial = planFixtures(eventId, teams, [scored], "groups");
assert.equal(partial.matches.length, 14);
assert.equal(partial.skipped, 1);
assert.ok(!partial.matches.some(m => pair(m) === pair(scored)));
assert.deepEqual(scored, before);
assert.equal(planFixtures(eventId, teams, rows, "groups").matches.length, 0);
assert.equal(planFixtures(eventId, teams, [{ ...scored, tournament_event_id: otherEvent }], "groups").matches.length, 15);
const duplicateRecord = { ...scored, id: uuid(900) };
assert.equal(planFixtures(eventId, teams, [scored, duplicateRecord], "groups").skipped, 1);
assert.notEqual(planFixtures(eventId, teams.map((t, i) => i ? t : { ...t, name: "Шинэ нэр" }), [], "groups").sourceKey, grouped.sourceKey);
assert.notEqual(partial.sourceKey, grouped.sourceKey);
assert.equal(planFixtures(eventId, teams, [{ ...scored, home_score: 99 }], "groups").sourceKey, partial.sourceKey);
const replacement = await fixtureRows(eventId, grouped.matches.slice(0, 1), [rows[0]]);
assert.notEqual(replacement[0].id, rows[0].id);
assert.deepEqual(await fixtureRows(eventId, grouped.matches.slice(0, 1), [rows[0]]), replacement);

assert.throws(() => planFixtures(eventId, [], [], "all"), /хоёроос/);
assert.throws(() => planFixtures(eventId, [team(1)], [], "all"), /хоёроос/);
assert.throws(() => planFixtures(eventId, [team(1), team(1)], [], "all"), /давхардсан/);
assert.throws(() => planFixtures(eventId, [team(1, "A"), team(2)], [], "groups"), /хэсгийг/);
assert.throws(() => planFixtures(eventId, [team(1, "A"), team(2, "B")], [], "groups"), /ганц баг/);
assert.equal(planFixtures(eventId, [team(1, " a "), team(2, "A")], [], "groups").matches.length, 1);
assert.throws(() => planFixtures(eventId, Array.from({ length: 46 }, (_, i) => team(i)), [], "all"), /1000/);
assert.equal(planFixtures(eventId, [team(1), { ...team(2), name: team(1).name }], [], "all").matches.length, 1);
const conflicting = { ...rows[1], home_team_id: rows[0].home_team_id, round: rows[0].round };
assert.throws(() => planFixtures(eventId, teams, [conflicting], "groups"), /давхцахаар/);
console.log("PASS: round-robin pairs/rounds for 2–32 teams, 4/3/3/3 groups, byes, validation, event isolation, existing/scored matches, stale snapshots, stable collision-safe IDs.");

// Exercise the actual schema: generated batches are owner-authorized, atomic,
// and a retry/concurrent request cannot replace or duplicate existing games.
const db = new PGlite();
try {
  const owner = uuid(10), outsider = uuid(11), tournamentId = uuid(12);
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.user',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
  await db.exec(await readFile("supabase/migrations/202610220001_tournament_workspace.sql", "utf8"));
  await db.query("insert into auth.users values ($1),($2)", [owner, outsider]);
  await db.query("select set_config('request.user',$1,false)", [owner]);
  await db.exec("set role authenticated");
  await db.query("insert into tournaments(id,owner_id,name) values ($1,$2,'Generator test')", [tournamentId, owner]);
  await db.query("insert into tournament_events(id,tournament_id,name,sport) values ($1,$2,'Basketball','basketball')", [eventId, tournamentId]);
  for (const t of teams) await db.query("insert into teams(id,tournament_event_id,name) values ($1,$2,$3)", [t.id, eventId, t.name]);
  const insert = items => db.query("insert into tournament_fixtures(id,tournament_event_id,home_team_id,away_team_id,round,status,home_score,away_score) select id,tournament_event_id,home_team_id,away_team_id,round,status,home_score,away_score from jsonb_to_recordset($1::jsonb) as x(id uuid,tournament_event_id uuid,home_team_id uuid,away_team_id uuid,round text,status text,home_score int,away_score int)", [JSON.stringify(items)]);
  await insert(rows);
  await db.query("update tournament_fixtures set status='completed', home_score=48, away_score=42 where id=$1", [rows[0].id]);
  const saved = (await db.query("select * from tournament_fixtures order by id")).rows;
  await assert.rejects(insert(rows), e => e.code === "23505");
  // A previously absent row at the beginning of a conflicting batch must roll back too.
  await assert.rejects(insert([{ ...rows[1], id: uuid(999) }, rows[0]]), e => e.code === "23505");
  assert.deepEqual((await db.query("select * from tournament_fixtures order by id")).rows, saved);
  await db.query("select set_config('request.user',$1,false)", [outsider]);
  await assert.rejects(insert([{ ...rows[1], id: uuid(998) }]), e => e.code === "42501");
  console.log("PASS: existing PostgreSQL schema accepts the batch; retries/overlapping batches roll back; scores survive; other owners cannot generate.");
} finally { await db.close(); }
