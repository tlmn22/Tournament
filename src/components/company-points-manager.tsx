"use client";

import { useRef, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { companyScoreMap, parseCompanyPoints } from "@/lib/company-points";
import { dataError, type Organization, type TournamentData } from "@/lib/tournaments";
import { ParticipationTable } from "./participation-table";
import { Notice } from "./tournament-ui";

export function CompanyPointsManager({ data, reload, onEvent }: { data: TournamentData; reload: () => void; onEvent: (id: string) => void }) {
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const panel = useRef<HTMLElement>(null);
  const company = data.organizations.find(org => org.id === companyId);
  const unavailable = data.companyPointsUnavailable || !data.events.length;
  function selectCompany(id: string) {
    if (busy || unavailable) return;
    setCompanyId(id); setSuccess("");
    panel.current?.scrollIntoView({ block: "start" });
  }
  return <div className="tp-stack">
    <section className="tp-panel tp-form tp-company-points-editor" ref={panel}>
      <h2>Төрөл бүрийн оноо</h2>
      <p className="tp-muted">Компанид төрөл бүрээр нэг оноо өгнө. Нэг төрөлд олон баг орсон ч энэ оноо нэг удаа тооцогдоно.</p>
      {data.companyPointsUnavailable && <Notice error>Оноо хадгалах хэсгийн өгөгдлийн сангийн тохиргоо дутуу байна.</Notice>}
      {!data.events.length && <Notice>Эхлээд спортын төрлүүдээ нэмээрэй.</Notice>}
      <label htmlFor="points-company">Компани</label>
      <select id="points-company" value={companyId} onChange={e => selectCompany(e.target.value)} disabled={busy || unavailable}>
        <option value="">Компани сонгох</option>
        {data.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      {company && !unavailable && <CompanyScoreForm key={company.id} company={company} data={data} busy={busy} setBusy={setBusy} cancel={() => setCompanyId("")} reload={reload} saved={() => {
        setSuccess(company.name + " компанийн оноо хадгалагдлаа.");
        setCompanyId(""); reload();
      }} />}
      {success && <Notice>{success}</Notice>}
    </section>
    <ParticipationTable data={data} onEvent={onEvent} onEdit={selectCompany} disabled={busy || unavailable} />
  </div>;
}

function CompanyScoreForm({ company, data, busy, setBusy, cancel, reload, saved }: {
  company: Organization; data: TournamentData; busy: boolean; setBusy: (value: boolean) => void;
  cancel: () => void; reload: () => void; saved: () => void;
}) {
  const [original] = useState(() => companyScoreMap(data.companyPoints, company.id));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(data.events.map(e => [e.id, String(original.get(e.id) ?? "")])));
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const dirty = data.events.some(e => (values[e.id] || "") !== String(original.get(e.id) ?? ""));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    try {
      const scores = data.events.map(e => ({
        tournament_event_id: e.id, points: parseCompanyPoints(values[e.id] || ""), expected_points: original.get(e.id) ?? null,
      })).filter(score => score.points !== score.expected_points);
      if (!scores.length) return;
      inFlight.current = true; setBusy(true);
      const { error } = await getSupabase().rpc("set_company_event_points", {
        p_tournament_id: data.tournament.id, p_company_id: company.id, p_scores: scores,
      });
      if (error) {
        if (error.code === "40001") {
          reload();
          throw new Error("UI:Оноо өөр цонхноос өөрчлөгдсөн байна. Засахаа болиод дахин нээнэ үү.");
        }
        if (error.code === "PGRST202") throw new Error("UI:Оноо хадгалах хэсгийн өгөгдлийн сангийн тохиргоо дутуу байна.");
        throw error;
      }
      saved();
    } catch (error) { setError(dataError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form onSubmit={save} aria-label={company.name + " компанийн оноо"}>
    <fieldset disabled={busy}>
      <div className="tp-company-points-fields">{data.events.map(event => <div key={event.id}>
        <label htmlFor={"company-points-" + event.id}>{event.name}</label>
        <input id={"company-points-" + event.id} type="number" inputMode="decimal" min={0} max={9999} step={0.01}
          value={values[event.id] || ""} placeholder="—" onChange={e => { setValues(current => ({ ...current, [event.id]: e.target.value })); setError(""); }}
          aria-describedby="company-points-help" />
      </div>)}</div>
      <p id="company-points-help" className="tp-muted">Хоосон бол оноо оруулаагүй гэж үзнэ. Өмнөх оноог арилгах бол талбарыг хоослоод хадгална.</p>
      <div className="tp-actions">
        <button type="submit" className="button button-dark" disabled={!dirty}>{busy ? "Хадгалж байна…" : "Оноо хадгалах"}</button>
        <button type="button" className="button button-outline" onClick={cancel}>Засахаа болих</button>
      </div>
    </fieldset>
    {error && <Notice error>{error}</Notice>}
  </form>;
}
