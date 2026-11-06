import type { CompanyEventPoints, Organization, TournamentData } from "./tournaments";

export type CompanyStanding = {
  organization: Organization;
  scores: Map<string, number>;
  total: number | null;
  rank: number | null;
};
export function parseCompanyPoints(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) throw new Error("UI:Оноог 0–9999 хооронд, таслалаас хойш хоёр хүртэл оронтой оруулна уу.");
  const points = Number(trimmed);
  if (!Number.isFinite(points) || points > 9999) throw new Error("UI:Оноог 0–9999 хооронд оруулна уу.");
  return points;
}
export const pointsLabel = (points: number | null) => points == null ? "—" : new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(points);
export function companyScoreMap(points: CompanyEventPoints[], companyId: string) {
  return new Map(points.filter(p => p.company_id === companyId).map(p => [p.tournament_event_id, p.points]));
}
export function companyStandings(data: Pick<TournamentData, "tournament" | "organizations" | "events" | "companyPoints">): CompanyStanding[] {
  const eventIds = new Set(data.events.map(e => e.id));
  const points = data.companyPoints.filter(p => p.tournament_id === data.tournament.id && eventIds.has(p.tournament_event_id));
  const rows = data.organizations.map(organization => {
    const scores = companyScoreMap(points, organization.id);
    // Sum hundredths so decimal scores such as 0.1 + 0.2 tie exactly with 0.3.
    const total = scores.size ? [...scores.values()].reduce((sum, score) => sum + Math.round(score * 100), 0) / 100 : null;
    return { organization, scores, total, rank: null } as CompanyStanding;
  }).sort((a, b) => {
    if (a.total == null && b.total != null) return 1;
    if (a.total != null && b.total == null) return -1;
    return (b.total ?? 0) - (a.total ?? 0) || a.organization.name.localeCompare(b.organization.name, "mn") || a.organization.id.localeCompare(b.organization.id);
  });
  let previous: number | null = null, rank = 0;
  rows.forEach((row, index) => {
    if (row.total == null) return;
    if (previous !== row.total) rank = index + 1;
    row.rank = rank;
    previous = row.total;
  });
  return rows;
}
