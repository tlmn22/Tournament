"use client";

import { useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { dataError, type Fixture, type Team } from "@/lib/tournaments";
import { fixtureRows, planFixtures, type FixturePlan, type GenerationMode } from "@/lib/fixture-generation";
import { Notice } from "./tournament-ui";

async function readEventRows<T>(table: "teams" | "tournament_fixtures", eventId: string): Promise<T[]> {
  const rows: T[] = [];
  // Read every page so an older matchup beyond Supabase's default limit is
  // still considered when skipping existing pairs.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await getSupabase().from(table).select("*")
      .eq("tournament_event_id", eventId).order("id").range(offset, offset + 999);
    if (error) throw error;
    rows.push(...data as T[]);
    if (data.length < 1000) return rows;
  }
}
async function readCurrent(eventId: string) {
  const [teams, fixtures] = await Promise.all([
    readEventRows<Team>("teams", eventId),
    readEventRows<Fixture>("tournament_fixtures", eventId),
  ]);
  return { teams, fixtures };
}

export function FixtureGenerator({ eventId, teams, reload }: { eventId: string; teams: Team[]; reload: () => void }) {
  const [mode, setMode] = useState<GenerationMode>(() => teams.some(t => t.group_name?.trim()) ? "groups" : "all");
  const [preview, setPreview] = useState<{ plan: FixturePlan; teams: Team[] } | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inFlight = useRef(false);

  async function prepare() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("preview"); setError(""); setSuccess(""); setPreview(null);
    try {
      const current = await readCurrent(eventId);
      setPreview({ plan: planFixtures(eventId, current.teams, current.fixtures, mode), teams: current.teams });
    } catch (error) { setError(dataError(error)); }
    finally { inFlight.current = false; setBusy(null); }
  }
  async function save() {
    if (inFlight.current || !preview?.plan.matches.length) return;
    inFlight.current = true;
    setBusy("save"); setError(""); setSuccess("");
    try {
      const current = await readCurrent(eventId);
      const plan = planFixtures(eventId, current.teams, current.fixtures, mode);
      if (plan.sourceKey !== preview.plan.sourceKey) {
        setPreview({ plan, teams: current.teams });
        setError("Баг эсвэл тоглолтын мэдээлэл өөрчлөгдсөн байна. Шинэчилсэн жагсаалтыг шалгаад дахин үүсгээрэй.");
        reload();
        return;
      }
      const rows = await fixtureRows(eventId, plan.matches, current.fixtures);
      // A single INSERT is atomic. A primary-key conflict from another
      // generator aborts this batch; existing fixtures and scores stay intact.
      const { error } = await getSupabase().from("tournament_fixtures").insert(rows);
      if (error) {
        if (error.code === "23505") throw new Error("UI:Тоглолтууд өөр цонхноос үүссэн байж болно. Урьдчилан харах товчоор жагсаалтаа шинэчилнэ үү.");
        throw error;
      }
      setSuccess(rows.length + " тоглолт үүсгэлээ.");
      setPreview(null);
      reload();
    } catch (error) { setError(dataError(error)); setPreview(null); }
    finally { inFlight.current = false; setBusy(null); }
  }

  const plan = preview?.plan;
  const names = new Map(preview?.teams.map(team => [team.id, team.name]));
  return <section className="tp-panel fixture-generator" aria-labelledby="fixture-generator-title" aria-busy={!!busy}>
    <div className="tp-panel-heading">
      <h2 id="fixture-generator-title">Тоглолт автоматаар үүсгэх</h2>
      <p>Баг бүр хоорондоо нэг удаа тоглоно. Өмнө бүртгэсэн хослолуудыг алгасана. Хасагдах шатны тоглолтыг дараа нь тусад нь нэмнэ.</p>
    </div>
    <fieldset className="fixture-generator-controls" disabled={!!busy}>
      <div className="tp-form">
        <label htmlFor="fixture-generation-mode">Тоглолт үүсгэх хэлбэр</label>
        <select id="fixture-generation-mode" value={mode} onChange={event => {
          setMode(event.target.value as GenerationMode); setPreview(null); setError(""); setSuccess("");
        }}>
          <option value="groups">Хэсэг тус бүр дотроо</option>
          <option value="all">Бүх баг нэг тойргоор</option>
        </select>
      </div>
      <button type="button" className="button button-outline" onClick={prepare}>
        {busy === "preview" ? "Шалгаж байна…" : "Урьдчилан харах"}
      </button>
    </fieldset>
    {mode === "groups" && <p className="tp-muted">«Багууд ба байр» хэсэгт оруулсан хэсгийн нэрээр багуудыг хослуулна.</p>}
    {error && <Notice error>{error}</Notice>}
    {success && <Notice>{success}</Notice>}
    {plan && <div className="fixture-generator-preview">
      <h3>Шинээр үүсэх · {plan.matches.length} тоглолт</h3>
      <p className="tp-muted">Нийт {plan.total} хослол{plan.skipped ? " · Бүртгэлтэй " + plan.skipped + " хослолыг алгаслаа" : ""}</p>
      <ul className="fixture-generator-groups">
        {plan.groups.map(group => <li key={group.name}>{group.name} · {group.teamCount} баг · {group.matchCount} тоглолт</li>)}
      </ul>
      {plan.matches.length > 0 ? <>
        <div className="tp-table-scroll" role="region" aria-label="Үүсэх тоглолтууд" tabIndex={0}>
          <table className="tp-matches-table">
            <caption className="sr-only">Хадгалахаас өмнөх тоглолтын жагсаалт</caption>
            <thead><tr><th scope="col">Шат / тойрог</th><th scope="col">Эхний баг</th><th scope="col">Хоёр дахь баг</th></tr></thead>
            <tbody>{plan.matches.map(match => <tr key={match.home_team_id + match.away_team_id}>
              <td>{match.round}</td><td className="tp-table-team">{names.get(match.home_team_id)}</td><td className="tp-table-team">{names.get(match.away_team_id)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!!plan.byes.length && !plan.skipped && <details className="fixture-generator-byes">
          <summary>Тойрог бүрд өнжих багууд</summary>
          <ul>{plan.byes.map(bye => <li key={bye.round + bye.teamId}>{bye.round} · {names.get(bye.teamId)}</li>)}</ul>
        </details>}
        <div className="tp-actions fixture-generator-actions">
          <button type="button" className="button button-dark" onClick={save} disabled={!!busy}>
            <CalendarPlus size={16} />{busy === "save" ? "Үүсгэж байна…" : plan.matches.length + " тоглолт үүсгэх"}
          </button>
          <button type="button" className="button button-outline" disabled={!!busy} onClick={() => { setPreview(null); setError(""); }}>Болих</button>
        </div>
      </> : <Notice>Бүх хослол бүртгэлтэй байна. Шинээр үүсгэх тоглолт алга.</Notice>}
    </div>}
  </section>;
}
