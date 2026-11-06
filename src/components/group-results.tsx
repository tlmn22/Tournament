"use client";

import { useId } from "react";
import { groupCellKey, type ResultGroup } from "@/lib/group-results";

export function GroupResults({ groups }: { groups: ResultGroup[] }) {
  const prefix = useId();
  return <section className="tp-group-results" aria-labelledby={prefix + "-title"}>
    <div className="tp-panel-heading">
      <h2 id={prefix + "-title"}>Хэсгийн үр дүн</h2>
      <p>Нүд бүрт мөрийн багийн оноо эхэнд, баганын багийн оноо дараа харагдана. — нь үр дүн ороогүй хослол.</p>
    </div>
    <div className="tp-group-results-grid">
      {groups.map((group, groupIndex) => {
        const title = group.event.name + " · " + group.name + " хэсэг";
        const labelId = prefix + "-group-" + groupIndex;
        return <section key={group.event.id + ":" + group.name} className="tp-group-result" aria-labelledby={labelId}>
          <div className="tp-group-heading"><h3 id={labelId}>{title}</h3><p>{group.teams.length} баг · {group.completed} тоглолт дууссан</p></div>
          <div className="tp-table-scroll" role="region" aria-label={title + " — үр дүнгийн хүснэгт"} tabIndex={0}>
            <table className="tp-group-matrix">
              <caption className="sr-only">{title}: багуудын хоорондын тоглолтын үр дүн. Баганын дугаар нь багийн мөрийн дугаартай таарна.</caption>
              <thead><tr>
                <th scope="col" className="tp-group-number">№</th>
                <th scope="col" className="tp-group-team">Нэр</th>
                {group.teams.map((team, index) => <th scope="col" key={team.id} title={team.name} aria-label={(index + 1) + ". " + team.name}>{index + 1}</th>)}
              </tr></thead>
              <tbody>{group.teams.map((team, rowIndex) => <tr key={team.id}>
                <td className="tp-group-number">{rowIndex + 1}</td>
                <th scope="row" className="tp-group-team">{team.name}</th>
                {group.teams.map(opponent => {
                  if (team.id === opponent.id) return <td key={opponent.id} className="tp-group-self"><span className="sr-only">Өөрийн баг</span></td>;
                  const results = group.cells.get(groupCellKey(team.id, opponent.id)) || [];
                  return <td key={opponent.id}>
                    {results.length ? <div className="tp-group-cell-results">{results.map((result, index) => <div key={result.fixtureId}>
                      <span className="tp-group-score" aria-label={team.name + " " + result.score + ", " + opponent.name + " " + result.opponentScore}>
                        <span className={result.score > result.opponentScore ? "tp-score-leading" : undefined}>{result.score}</span>
                        <span className="tp-group-colon">:</span>
                        <span className={result.opponentScore > result.score ? "tp-score-leading" : undefined}>{result.opponentScore}</span>
                      </span>
                      {results.length > 1 && <small>{result.round || (index + 1) + "-р тоглолт"}</small>}
                    </div>)}</div> : <span className="tp-group-pending" aria-label="Үр дүн ороогүй">—</span>}
                  </td>;
                })}
              </tr>)}</tbody>
            </table>
          </div>
        </section>;
      })}
    </div>
  </section>;
}
