import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { companyStandings, parseCompanyPoints } from "../src/lib/company-points.ts";

for (const [input, expected] of [["", null], [" ", null], ["0", 0], ["0.25", 0.25], ["9999", 9999], ["12.50", 12.5]]) assert.equal(parseCompanyPoints(input), expected);
for (const input of ["-1", "10000", "1.234", "NaN", "Infinity", "1e2", "text"]) assert.throws(() => parseCompanyPoints(input));
const data = {
  tournament: { id: "cup" },
  events: [{ id: "basketball" }, { id: "volleyball" }],
  organizations: ["A", "B", "C", "D"].map(id => ({ id, name: id })),
  companyPoints: [
    { tournament_id: "cup", company_id: "A", tournament_event_id: "basketball", points: 0.1 },
    { tournament_id: "cup", company_id: "A", tournament_event_id: "volleyball", points: 0.2 },
    { tournament_id: "cup", company_id: "B", tournament_event_id: "basketball", points: 0.3 },
    { tournament_id: "cup", company_id: "C", tournament_event_id: "volleyball", points: 0 },
    { tournament_id: "other", company_id: "A", tournament_event_id: "basketball", points: 999 },
    { tournament_id: "cup", company_id: "A", tournament_event_id: "other", points: 999 },
  ],
  teams: [{ company_id: "A", result_points: 99 }, { company_id: "A", result_points: 100 }],
};
const original = structuredClone(data);
assert.deepEqual(companyStandings(data).map(r => [r.organization.id, r.total, r.rank]), [["A", 0.3, 1], ["B", 0.3, 1], ["C", 0, 3], ["D", null, null]]);
assert.equal(companyStandings(data)[0].scores.size, 2);
assert.deepEqual(data, original);
console.log("PASS: decimal-safe totals, shared ranks, blank versus zero, one company row, sport-team scores excluded, foreign data excluded, input validation.");

const db = new PGlite();
const uuid = n => "cccccccc-cccc-4ccc-8ccc-" + String(n).padStart(12, "0");
const owner = uuid(1), other = uuid(2), cup = uuid(3), otherCup = uuid(4), event1 = uuid(5), event2 = uuid(6), foreignEvent = uuid(7), company = uuid(8), foreignCompany = uuid(9);
const migration = await readFile("supabase/migrations/202611060001_company_event_points.sql", "utf8");
try {
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.user',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
  await db.exec(await readFile("supabase/migrations/202610220001_tournament_workspace.sql", "utf8"));
  await db.exec(migration);
  await db.query("insert into auth.users values ($1),($2)", [owner, other]);
  async function asUser(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.user',$1,false)", [id || ""]);
    await db.exec("set role " + (id ? "authenticated" : "anon"));
  }
  await asUser(owner);
  await db.query("insert into tournaments(id,owner_id,name) values ($1,$2,'Main'),($3,$2,'Other')", [cup, owner, otherCup]);
  await db.query("insert into companies(id,tournament_id,name) values ($1,$2,'Company'),($3,$4,'Other company')", [company, cup, foreignCompany, otherCup]);
  await db.query("insert into tournament_events(id,tournament_id,name,sport) values ($1,$2,'Basketball','basketball'),($3,$2,'Volleyball','volleyball'),($4,$5,'Foreign','basketball')", [event1, cup, event2, foreignEvent, otherCup]);
  const patch = (id, points, expected = null) => ({ tournament_event_id: id, points, expected_points: expected });
  const save = (scores, companyId = company, tournamentId = cup) => db.query("select set_company_event_points($1,$2,$3::jsonb)", [tournamentId, companyId, JSON.stringify(scores)]);
  const rows = async () => (await db.query("select company_id,tournament_event_id,points from company_event_points order by tournament_event_id")).rows;
  const denied = (promise, code) => assert.rejects(promise, error => error.code === code);
  await save([patch(event1, 10), patch(event2, 5.5)]);
  assert.equal((await rows()).length, 2);
  assert.equal(Number((await rows()).find(r => r.tournament_event_id === event2).points), 5.5);
  await denied(save([patch(event1, 99)]), "40001");
  await save([patch(event1, 11, 10), patch(event2, null, 5.5)]);
  assert.equal((await rows()).length, 1);
  assert.equal(Number((await rows())[0].points), 11);

  const baseline = await rows();
  await denied(save([patch(event1, 12, 11), patch(event2, -1)]), "23514");
  assert.deepEqual(await rows(), baseline, "All changes roll back if any score is invalid");
  await denied(save([patch(event1, 12, 11), patch(event2, 1, 99)]), "40001");
  assert.deepEqual(await rows(), baseline, "All changes roll back if any score is stale");
  for (const invalid of [10000, -1, 0.001, "10", "NaN"]) await denied(save([patch(event2, invalid)]), "23514");
  await denied(save([patch(event2, 1), patch(event2, 2)]), "23514");
  await denied(save([{ tournament_event_id: event2, points: 1 }]), "23514");
  await denied(save([patch(foreignEvent, 3)]), "23514");
  await denied(save([patch(event1, 3)], foreignCompany), "23514");
  await denied(db.query("insert into company_event_points(tournament_id,company_id,tournament_event_id,points) values ($1,$2,$3,1)", [cup, company, foreignEvent]), "23503");
  await denied(db.query("insert into company_event_points(tournament_id,company_id,tournament_event_id,points) values ($1,$2,$3,1)", [otherCup, company, foreignEvent]), "23503");
  await save([patch(event1, 0, 11)]);
  assert.equal(Number((await rows())[0].points), 0);
  await save([patch(event1, null, 0)]);
  assert.equal((await rows()).length, 0);
  await save([patch(event1, 7.25)]);

  await asUser(other);
  assert.equal((await rows()).length, 0);
  await denied(save([patch(event1, 99, 7.25)]), "42501");
  await denied(db.query("insert into company_event_points(tournament_id,company_id,tournament_event_id,points) values ($1,$2,$3,1)", [cup, company, event2]), "42501");
  assert.equal((await db.query("update company_event_points set points=99 returning *")).rows.length, 0);
  await asUser(null);
  assert.equal((await rows()).length, 0);
  await denied(save([patch(event1, 99, 7.25)]), "42501");
  await asUser(owner);
  await db.query("update tournaments set status='published' where id=$1", [cup]);
  await asUser(null);
  assert.equal(Number((await rows())[0].points), 7.25);
  await asUser(other);
  assert.equal((await db.query("delete from company_event_points returning *")).rows.length, 0);
  await denied(save([patch(event1, 99, 7.25)]), "42501");
  await asUser(owner);
  await db.query("update tournaments set status='draft' where id=$1", [cup]);
  await asUser(null);
  assert.equal((await rows()).length, 0);
  await db.exec("reset role");
  await db.exec(migration);
  await asUser(owner);
  assert.equal(Number((await rows())[0].points), 7.25, "Reapplying migration preserves points");
  console.log("PASS: existing schema migration, atomic save/clear, stale-write guard, company/event foreign keys, precision/range/duplicate validation, owner-only writes, published-only reads, safe migration rerun.");
} finally { await db.close(); }
