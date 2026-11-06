import type { Team, TournamentData, TournamentEvent } from "./tournaments";

export type GroupScore = { fixtureId: string; round: string; score: number; opponentScore: number };
export type ResultGroup = {
  event: TournamentEvent;
  name: string;
  teams: Team[];
  cells: Map<string, GroupScore[]>;
  completed: number;
};
export const groupCellKey = (rowTeamId: string, columnTeamId: string) => rowTeamId + ":" + columnTeamId;

/** Group membership is scoped to the sport/event, never just the group name.
 * Store both score directions so each cell starts with its row team's score. */
export function buildGroupResults(data: Pick<TournamentData, "events" | "teams" | "fixtures">, eventId: string): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const membership = new Map<string, ResultGroup>();
  for (const event of data.events.filter(event => eventId === "all" || event.id === eventId)) {
    const eventGroups = new Map<string, ResultGroup>();
    for (const team of data.teams.filter(team => team.tournament_event_id === event.id)) {
      const name = (team.group_name || "").normalize("NFC").trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = name.toUpperCase();
      let group = eventGroups.get(key);
      if (!group) {
        group = { event, name, teams: [], cells: new Map(), completed: 0 };
        eventGroups.set(key, group);
      }
      group.teams.push(team);
      membership.set(team.id, group);
    }
    groups.push(...[...eventGroups.values()].sort((a, b) => a.name.localeCompare(b.name, "mn", { numeric: true })));
  }
  for (const fixture of data.fixtures) {
    if (fixture.status !== "completed" || fixture.home_score == null || fixture.away_score == null || fixture.home_team_id === fixture.away_team_id) continue;
    const group = membership.get(fixture.home_team_id);
    if (!group || group !== membership.get(fixture.away_team_id) || group.event.id !== fixture.tournament_event_id) continue;
    const homeKey = groupCellKey(fixture.home_team_id, fixture.away_team_id);
    const awayKey = groupCellKey(fixture.away_team_id, fixture.home_team_id);
    const common = { fixtureId: fixture.id, round: fixture.round };
    group.cells.set(homeKey, [...(group.cells.get(homeKey) || []), { ...common, score: fixture.home_score, opponentScore: fixture.away_score }]);
    group.cells.set(awayKey, [...(group.cells.get(awayKey) || []), { ...common, score: fixture.away_score, opponentScore: fixture.home_score }]);
    group.completed++;
  }
  return groups;
}
