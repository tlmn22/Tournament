import type { Fixture, Team } from "./tournaments";

export type GenerationMode = "groups" | "all";
export type PlannedFixture = Pick<Fixture, "home_team_id" | "away_team_id" | "round">;
export type FixturePlan = {
  matches: PlannedFixture[];
  total: number;
  skipped: number;
  groups: { name: string; teamCount: number; matchCount: number }[];
  byes: { teamId: string; round: string }[];
  sourceKey: string;
};

const MAX_MATCHES = 1000;
const groupLabel = (team: Team) => (team.group_name || "").normalize("NFC").trim().replace(/\s+/g, " ");
const pairKey = (home: string, away: string) => JSON.stringify([home, away].sort());

/** One meeting per pair, with at most one game per team in each round. */
export function planFixtures(eventId: string, allTeams: Team[], allFixtures: Fixture[], mode: GenerationMode): FixturePlan {
  const teams = allTeams.filter(t => t.tournament_event_id === eventId).sort((a, b) => a.id.localeCompare(b.id));
  const fixtures = allFixtures.filter(f => f.tournament_event_id === eventId).sort((a, b) => a.id.localeCompare(b.id));
  if (teams.length < 2) throw new Error("UI:Тоглолт үүсгэхийн тулд хоёроос доошгүй баг хэрэгтэй.");
  if (new Set(teams.map(t => t.id)).size !== teams.length) throw new Error("UI:Багийн мэдээлэл давхардсан байна. Хуудсаа шинэчилнэ үү.");
  if (mode !== "groups" && mode !== "all") throw new Error("UI:Тоглолт үүсгэх хэлбэрээ сонгоно уу.");

  const buckets = new Map<string, { name: string; teams: Team[] }>();
  for (const team of teams) {
    const label = mode === "groups" ? groupLabel(team) : "";
    if (mode === "groups" && !label) {
      throw new Error("UI:«" + team.name + "» багийн хэсгийг оруулна уу. Эсвэл «Бүх баг нэг тойргоор» сонгоорой.");
    }
    const key = label.toUpperCase();
    const group = buckets.get(key) || { name: label, teams: [] };
    group.teams.push(team);
    buckets.set(key, group);
  }
  const groups = [...buckets.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const group of groups) {
    if (group.teams.length < 2) throw new Error("UI:«" + group.name + "» хэсэгт ганц баг байна. Хэсэг бүрд хоёроос доошгүй баг бүртгэнэ үү.");
  }
  const total = groups.reduce((sum, group) => sum + group.teams.length * (group.teams.length - 1) / 2, 0);
  if (total > MAX_MATCHES) throw new Error("UI:1000-аас олон тоглолт үүсэхээр байна. Багуудаа жижиг хэсгүүдэд хуваана уу.");

  // Ignore orientation and stage: existing matchups, including scored games,
  // are never overwritten or duplicated by a single round-robin generator.
  const existing = new Set(fixtures.map(f => pairKey(f.home_team_id, f.away_team_id)));
  const rounds: PlannedFixture[][] = [];
  const byes: FixturePlan["byes"] = [];
  let skipped = 0;
  for (const group of groups) {
    const rotation: (Team | null)[] = [...group.teams];
    if (rotation.length % 2) rotation.push(null);
    for (let round = 0; round < rotation.length - 1; round++) {
      const label = (group.name ? group.name + " · " : "") + (round + 1) + "-р тойрог";
      rounds[round] ||= [];
      for (let i = 0; i < rotation.length / 2; i++) {
        const first = rotation[i], second = rotation[rotation.length - 1 - i];
        if (!first || !second) {
          byes.push({ teamId: (first || second)!.id, round: label });
          continue;
        }
        if (existing.has(pairKey(first.id, second.id))) { skipped++; continue; }
        const [home, away] = (round + i) % 2 ? [second, first] : [first, second];
        rounds[round].push({ home_team_id: home.id, away_team_id: away.id, round: label });
      }
      rotation.splice(1, 0, rotation.pop()!);
    }
  }
  // Existing fixtures may have manually assigned rounds. Do not propose a
  // second game for the same team in that round.
  const usedByRound = new Map<string, Set<string>>();
  for (const fixture of fixtures) {
    const used = usedByRound.get(fixture.round.trim()) || new Set<string>();
    used.add(fixture.home_team_id); used.add(fixture.away_team_id);
    usedByRound.set(fixture.round.trim(), used);
  }
  for (const match of rounds.flat()) {
    const used = usedByRound.get(match.round);
    if (used?.has(match.home_team_id) || used?.has(match.away_team_id)) {
      throw new Error("UI:«" + match.round + "»-т нэг багийн тоглолт давхцахаар байна. Бүртгэлтэй тоглолтын тойргийг шалгаж засна уу.");
    }
  }
  return {
    matches: rounds.flat(), total, skipped, byes,
    groups: groups.map(g => ({ name: g.name || "Бүх баг", teamCount: g.teams.length, matchCount: g.teams.length * (g.teams.length - 1) / 2 })),
    sourceKey: JSON.stringify({
      eventId, mode,
      teams: teams.map(t => [t.id, t.name, groupLabel(t)]),
      fixtures: fixtures.map(f => [f.id, f.home_team_id, f.away_team_id]),
    }),
  };
}

/** Stable UUIDv8 IDs make simultaneous generator submissions conflict on the
 * existing primary key. Always INSERT the batch, never upsert existing scores. */
export async function fixtureRows(eventId: string, matches: PlannedFixture[], existing: Fixture[]): Promise<Fixture[]> {
  const occupied = new Set(existing.map(f => f.id));
  return Promise.all(matches.map(async match => {
    let attempt = 0;
    let id: string;
    do {
      const value = JSON.stringify(["round-robin-v1", eventId, pairKey(match.home_team_id, match.away_team_id), attempt++]);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
      digest[6] = (digest[6] & 0x0f) | 0x80;
      digest[8] = (digest[8] & 0x3f) | 0x80;
      const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
      id = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
      // A manager may have edited the teams on an earlier generated match.
      // Keep that record and use another stable ID for the now-missing pairing.
    } while (occupied.has(id));
    return { id, tournament_event_id: eventId, ...match, status: "scheduled", home_score: null, away_score: null, starts_at: null, venue: "" };
  }));
}
