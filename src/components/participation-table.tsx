"use client";
import { Crown } from "lucide-react";
import type { TournamentData } from "@/lib/tournaments";
import { companyStandings, pointsLabel, type CompanyStanding } from "@/lib/company-points";
import { TeamLogo } from "./festival-media";
import { Empty } from "./tournament-ui";

const podiumPlaces = ["is-first", "is-second", "is-third"];
// Top three ranked organizations; DOM keeps rank order while CSS lays them out 2-1-3.
function Podium({ standings }: { standings: CompanyStanding[] }) {
  const leaders = standings.filter(row => row.rank != null).slice(0, 3);
  if (!leaders.length) return null;
  return <section className="tp-podium" aria-label="Тэргүүлэгчид"><ol>{leaders.map((row, index) => <li key={row.organization.id} className={"tp-podium-step " + podiumPlaces[index]}>
    <div className="tp-podium-team">{index === 0 && <Crown className="tp-podium-crown" size={30} strokeWidth={1.8} aria-hidden="true" />}<span className="tp-podium-logo"><TeamLogo name={row.organization.name} url={row.organization.logo_url} /></span><strong>{row.organization.name}</strong><span>{pointsLabel(row.total)} оноо</span></div>
    <div className="tp-podium-block"><span><span className="sr-only">Байр </span>{row.rank}</span></div>
  </li>)}</ol></section>;
}

export function ParticipationTable({ data, onEvent, onEdit, disabled = false }: {
  data: TournamentData; onEvent?: (id: string) => void; onEdit?: (companyId: string) => void; disabled?: boolean;
}) {
  if (!data.organizations.length) return <Empty title="Оролцогч багууд хараахан нэмэгдээгүй.">Компани бүрийн төрөл тус бүрийн оноо, нийт дүн энд харагдана.</Empty>;
  const standings = companyStandings(data);
  return <section>
    {!onEdit && <Podium standings={standings} />}
    <div className="tp-section-title"><div><h2>Нийт оноо</h2><p className="tp-muted">Админы өгсөн онооны нийлбэрээр эрэмбэлнэ. Тэнцүү оноотой компаниуд ижил байр эзэлнэ.</p></div></div>
    <div className="tp-table-scroll" role="region" aria-label="Бүх спортын оролцооны хүснэгт" tabIndex={0}>
      <table className="tp-matches-table participation-table">
        <caption className="sr-only">Компани бүрийн төрөл тус бүрийн оноо, нийт оноо болон байр</caption>
        <thead><tr>
          <th scope="col" className="tp-standing-rank">Байр</th><th scope="col" className="tp-standing-company">Оролцогч баг</th><th scope="col" className="tp-standing-total">Нийт оноо</th>
          {data.events.map(event => <th scope="col" className="tp-standing-points" key={event.id}>{onEvent ? <button className="festival-column-link" type="button" onClick={() => onEvent(event.id)}>{event.name} ↗</button> : event.name}</th>)}
          {onEdit && <th scope="col">Үйлдэл</th>}
        </tr></thead>
        <tbody>{standings.map(row => <tr key={row.organization.id}>
          <td className="tp-standing-rank">{row.rank ?? "—"}</td>
          <th scope="row" className="tp-standing-company"><span className="festival-team-name"><TeamLogo name={row.organization.name} url={row.organization.logo_url} />{row.organization.name}</span></th>
          <td className="tp-standing-total">{pointsLabel(row.total)}</td>
          {data.events.map(event => <td className="tp-standing-points" key={event.id} title={row.scores.has(event.id) ? undefined : "Оноо оруулаагүй"}>{pointsLabel(row.scores.get(event.id) ?? null)}</td>)}
          {onEdit && <td><button type="button" className="button button-outline tp-points-edit" onClick={() => onEdit(row.organization.id)} disabled={disabled} aria-label={row.organization.name + " оноо засах"}>Оноо засах</button></td>}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
