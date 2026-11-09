"use client";
import type { TournamentData } from "@/lib/tournaments";
import { companyStandings, pointsLabel } from "@/lib/company-points";
import { TeamLogo } from "./festival-media";
import { Empty } from "./tournament-ui";

export function ParticipationTable({ data, onEvent, onEdit, disabled = false }: {
  data: TournamentData; onEvent?: (id: string) => void; onEdit?: (companyId: string) => void; disabled?: boolean;
}) {
  if (!data.organizations.length) return <Empty title="Оролцогч багууд хараахан нэмэгдээгүй.">Компани бүрийн төрөл тус бүрийн оноо, нийт дүн энд харагдана.</Empty>;
  const standings = companyStandings(data);
  return <section>
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
