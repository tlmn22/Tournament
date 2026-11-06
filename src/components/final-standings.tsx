"use client";
import type { TournamentData } from "@/lib/tournaments";
import { TeamLogo } from "./festival-media";

export function FinalStandings({ data, eventId }: { data: TournamentData; eventId: string }) {
  return <>{data.events.filter(e => eventId === "all" || e.id === eventId).map(event => {
    const rows = data.teams.filter(t => t.tournament_event_id === event.id && t.final_place != null).sort((a,b) => a.final_place! - b.final_place!);
    if (!rows.length) return null;
    return <section key={event.id} style={{ marginBottom: 32 }}>
      <div className="tp-section-title"><h2>{event.name} · Эцсийн байр</h2></div>
      {event.results_note && <p className="festival-note">{event.results_note}</p>}
      <div className="tp-table-scroll" role="region" aria-label={event.name + " эцсийн байр"} tabIndex={0}>
      <table className="tp-matches-table"><thead><tr><th scope="col">Байр</th><th scope="col">Оролцогч</th><th scope="col">Харьяалах баг</th><th scope="col">Оноо</th></tr></thead>
      <tbody>{rows.map(row => {
        const org=data.organizations.find(o=>o.id===row.company_id);
        return <tr key={row.id}><td>{row.final_place}</td><th scope="row">{row.name}</th><td><span className="festival-team-name"><TeamLogo name={org?.name || row.name} url={org?.logo_url} />{org?.name || "—"}</span></td><td>{row.result_points ?? "—"}</td></tr>;
      })}</tbody></table></div>
    </section>;
  })}</>;
}
