"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import Link from "next/link";
import { TeamLogo } from "./festival-media";
import { ArrowUpRight, CalendarDays, Trophy } from "lucide-react";
import { dateLabel, matchStatuses, type Tournament, type Fixture, type Team, type Organization, dataError } from "@/lib/tournaments";

export function useRemote<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<{ data: T | null; pending: boolean; error: string }>({ data: null, pending: true, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setState(s => ({ ...s, pending: true, error: "" })); });
    void fetcher().then(data => { if (active) setState({ data, pending: false, error: "" }); })
      .catch(error => { if (active) setState({ data: null, pending: false, error: dataError(error) }); });
    return () => { active = false; };
    // The caller declares the stable query keys; fetcher is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  return { ...state, reload };
}
export function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div className={error ? "tp-notice tp-error" : "tp-notice"} role={error ? "alert" : "status"}>{children}</div>;
}
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="tp-empty"><span className="tp-empty-icon"><Trophy size={28} /></span><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}
export function TournamentCard({ tournament: t, admin = false }: { tournament: Tournament; admin?: boolean }) {
  return <Link className="tp-card" href={admin ? "/admin/tournaments/" + t.id : "/tournaments/" + t.id}>
    <div className="tp-card-art"><Trophy size={48} strokeWidth={1.2} /><span className={"tp-badge " + (t.status === "published" ? "is-published" : "")}>{t.status === "published" ? "Нийтэлсэн" : "Ноорог"}</span><span className="tp-art-lines" aria-hidden="true" /></div>
    <div className="tp-card-body"><span className="tp-card-date"><CalendarDays size={15} />{dateLabel(t.start_date)}</span><h2>{t.name}</h2><p>{t.description || "Багууд, тоглолтын хуваарь, үр дүнг нэг дороос."}</p><span className="tp-card-link">{admin ? "Удирдах" : "Тэмцээн үзэх"}<ArrowUpRight size={18} /></span></div>
  </Link>;
}
export function MatchTable({ matches, teams, events = [], organizations = [], actions }: {
  matches: Fixture[]; teams: Team[]; organizations?: Organization[]; events?: { id: string; name: string }[];
  actions?: (match: Fixture) => React.ReactNode;
}) {
  const names = new Map(teams.map(team => [team.id, team.name]));
  const logo = (id: string) => organizations.find(org => org.id === teams.find(team => team.id === id)?.company_id)?.logo_url;
  return <div className={"tp-table-scroll tp-match-list" + (events.length > 1 ? " has-events" : "")} role="region" aria-label="Тоглолтын хүснэгт" tabIndex={0}>
    <table className="tp-matches-table" role="table">
      <caption className="sr-only">Тоглолтууд: багууд, оноо, шат болон төлөв</caption>
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">№</th>{events.length > 1 && <th role="columnheader" scope="col">Ангилал</th>}<th role="columnheader" scope="col" className="tp-match-home">Эхний баг</th><th role="columnheader" scope="col" className="tp-table-score">Оноо</th><th role="columnheader" scope="col">Хоёр дахь баг</th><th role="columnheader" scope="col">Шат / тойрог</th><th role="columnheader" scope="col">Төлөв</th>{actions && <th role="columnheader" scope="col">Үйлдэл</th>}</tr></thead>
      <tbody role="rowgroup">{matches.map((match, index) => <tr role="row" key={match.id} className={match.status === "live" ? "is-live" : undefined}>
        <th role="rowheader" scope="row" className="tp-row-number">{index + 1}</th>
        {events.length > 1 && <td role="cell" className="tp-match-event-label">{events.find(e => e.id === match.tournament_event_id)?.name || "—"}</td>}
        <td role="cell" className="tp-table-team tp-match-home"><span className="festival-team-name"><span className="tp-match-team-label">{names.get(match.home_team_id) || "Баг тодорхойгүй"}</span><TeamLogo name={names.get(match.home_team_id) || "Баг тодорхойгүй"} url={logo(match.home_team_id)} /></span></td>
        <td role="cell" className="tp-table-score"><span className={match.home_score !== null && match.away_score !== null && match.home_score > match.away_score ? "tp-score-leading" : undefined}>{match.home_score ?? "—"}</span><span className="tp-score-divider">:</span><span className={match.home_score !== null && match.away_score !== null && match.away_score > match.home_score ? "tp-score-leading" : undefined}>{match.away_score ?? "—"}</span></td>
        <td role="cell" className="tp-table-team tp-match-away"><span className="festival-team-name"><TeamLogo name={names.get(match.away_team_id) || "Баг тодорхойгүй"} url={logo(match.away_team_id)} /><span className="tp-match-team-label">{names.get(match.away_team_id) || "Баг тодорхойгүй"}</span></span></td>
        <td role="cell" className="tp-match-round">{match.round || "—"}</td>
        <td role="cell" className="tp-match-status"><span className={"tp-badge match-" + match.status}>{match.status === "live" && <span className="tiny-dot" />}{matchStatuses[match.status]}</span></td>
        {actions && <td role="cell" className="tp-match-actions-cell"><div className="tp-table-actions">{actions(match)}</div></td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
