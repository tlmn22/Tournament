"use client";
import type { TournamentData } from "@/lib/tournaments";
import { TeamLogo } from "./festival-media";

const half = (n: number | null | undefined) => n == null ? "—" : n % 1 === 0.5 ? (Math.trunc(n) || "") + "½" : String(n);
// Swiss-system columns, shown only when the imported standings carry them.
const detailColumns = [["games", "Gam."], ["wins", "+"], ["draws", "="], ["losses", "-"], ["mp", "MP"], ["points", "Pts."], ["ede", "EDE"], ["bh_gp", "BH:GP"]] as const;

export function FinalStandings({ data, eventId }: { data: TournamentData; eventId: string }) {
  return <>{data.events.filter(e => eventId === "all" || e.id === eventId).map(event => {
    const rows = data.teams.filter(t => t.tournament_event_id === event.id && t.final_place != null).sort((a,b) => a.final_place! - b.final_place!);
    if (!rows.length) return null;
    const detailed = rows.some(row => row.result_details);
    return <section key={event.id} style={{ marginBottom: 32 }}>
      <div className="tp-section-title"><h2>{event.name} · Эцсийн байр</h2></div>
      {event.results_note && <p className="festival-note">{event.results_note}</p>}
      <div className="tp-table-scroll" role="region" aria-label={event.name + " эцсийн байр"} tabIndex={0}>
      {detailed ? <table className="tp-matches-table tp-final-ranking"><thead><tr><th scope="col">Rank</th><th scope="col">Team</th>{detailColumns.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => {
        const org = data.organizations.find(o => o.id === row.company_id), d = row.result_details || {};
        return <tr key={row.id}><td>{row.final_place}</td><th scope="row"><span className="festival-team-name"><TeamLogo name={org?.name || row.name} url={org?.logo_url} />{row.name}</span></th>{detailColumns.map(([key]) => <td key={key} className={key === "points" ? "tp-final-points" : undefined}>{key === "points" ? half(row.result_points) : d[key] ?? "—"}</td>)}</tr>;
      })}</tbody></table>
      : <table className="tp-matches-table"><thead><tr><th scope="col">Байр</th><th scope="col">Оролцогч</th><th scope="col">Харьяалах баг</th><th scope="col">Оноо</th></tr></thead>
      <tbody>{rows.map(row => {
        const org=data.organizations.find(o=>o.id===row.company_id);
        return <tr key={row.id}><td>{row.final_place}</td><th scope="row">{row.name}</th><td><span className="festival-team-name"><TeamLogo name={org?.name || row.name} url={org?.logo_url} />{org?.name || "—"}</span></td><td>{row.result_points ?? "—"}</td></tr>;
      })}</tbody></table>}</div>
    </section>;
  })}</>;
}
