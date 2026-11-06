import assert from "node:assert/strict";
import { buildGroupResults, groupCellKey } from "../src/lib/group-results.ts";

const team = (id, group, event = "men") => ({ id, tournament_event_id: event, company_id: null, name: id, group_name: group });
const fixture = (id, home, away, score, opponentScore, status = "completed", event = "men") => ({
  id, tournament_event_id: event, home_team_id: home, away_team_id: away,
  home_score: score, away_score: opponentScore, status, round: id, starts_at: null, venue: "",
});
const data = {
  events: [{ id: "men", name: "Сагс эрэгтэй" }, { id: "women", name: "Сагс эмэгтэй" }],
  teams: [team("a1", "A"), team("a2", " a "), team("a3", "A"), team("a4", "A"), team("b1", "B"), team("b2", "B"), team("none", null), team("w1", "A", "women"), team("w2", "A", "women")],
  fixtures: [
    fixture("zero", "a1", "a2", 0, 12),
    fixture("return", "a2", "a1", 9, 8),
    fixture("draw", "a3", "a4", 5, 5),
    fixture("live", "a1", "a3", 4, 6, "live"),
    fixture("upcoming", "a2", "a4", null, null, "scheduled"),
    fixture("cross-group", "a1", "b1", 1, 2),
    fixture("cross-event", "a1", "w1", 1, 2),
    fixture("wrong-event", "a1", "a2", 1, 2, "completed", "women"),
    fixture("incomplete", "a1", "a4", null, 11),
    fixture("self", "a1", "a1", 2, 2),
    fixture("ungrouped", "a1", "none", 3, 1),
    fixture("women", "w1", "w2", 1, 0, "completed", "women"),
  ],
};
const before = structuredClone(data);
const groups = buildGroupResults(data, "all");
assert.equal(groups.length, 3);
const [a, b, women] = groups;
assert.deepEqual(a.teams.map(t => t.id), ["a1", "a2", "a3", "a4"]);
assert.equal(a.completed, 3);
assert.deepEqual(a.cells.get(groupCellKey("a1", "a2")).map(r => [r.score, r.opponentScore]), [[0, 12], [8, 9]]);
assert.deepEqual(a.cells.get(groupCellKey("a2", "a1")).map(r => [r.score, r.opponentScore]), [[12, 0], [9, 8]]);
assert.deepEqual(a.cells.get(groupCellKey("a3", "a4")).map(r => [r.score, r.opponentScore]), [[5, 5]]);
assert.equal(a.cells.has(groupCellKey("a1", "a3")), false);
assert.equal(a.cells.has(groupCellKey("a2", "a4")), false);
assert.equal(a.cells.has(groupCellKey("a1", "a1")), false);
assert.equal(a.cells.size, 4, "Only completed, same-event, same-group pairs appear");
assert.equal(b.completed, 0);
assert.equal(b.cells.size, 0);
assert.equal(women.completed, 1);
assert.equal(women.event.id, "women");
assert.equal(buildGroupResults(data, "men").length, 2);
assert.equal(buildGroupResults(data, "women").length, 1);
assert.equal(buildGroupResults(data, "missing").length, 0);
assert.equal(buildGroupResults({ ...data, teams: data.teams.map(t => ({ ...t, group_name: null })) }, "all").length, 0);
assert.deepEqual(data, before);
console.log("PASS: mirrored scores, zero/draw results, repeated matchups, group normalization, stable team order, completed-only cells, sport/group isolation, empty and ungrouped data.");
