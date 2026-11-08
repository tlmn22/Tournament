"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ExternalLink, Globe2, EyeOff, Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "./auth-provider";
import { getSupabase } from "@/lib/supabase";
import { loadTournament, sports, dataError, type TournamentData, type Team, type Fixture } from "@/lib/tournaments";
import { useRemote, Notice, Empty, MatchTable } from "./tournament-ui";
import { TournamentEditor } from "./tournament-editor";
import { OrganizationsManager } from "./festival-organizations";
import { SportsManager } from "./festival-sports";
import { CompanyPointsManager } from "./company-points-manager";
import { TeamLogo } from "./festival-media";
import { FixtureGenerator } from "./fixture-generator";

export function AdminTournament({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, pending, error, reload } = useRemote(() => loadTournament(id, user?.id), [id, user?.id]);
  const [tab, setTab] = useState("organizations");
  const [sportTab, setSportTab] = useState("teams");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState("");
  async function publish() {
    if (!data || !user || busy) return;
    setBusy(true); setActionError("");
    try {
      const { error } = await getSupabase().from("tournaments").update({ status: data.tournament.status === "published" ? "draft" : "published" }).eq("id", id).eq("owner_id", user.id).select("id").single();
      if (error) throw error;
      reload();
    } catch (error) { setActionError(dataError(error)); }
    finally { setBusy(false); }
  }
  if (pending && !data) return <Notice>Тэмцээнийг ачаалж байна…</Notice>;
  if (error) return <Notice error>{error} <button onClick={reload}>Дахин оролдох</button></Notice>;
  if (!data) return <Empty title="Тэмцээн олдсонгүй.">Та зөвхөн өөрийн үүсгэсэн тэмцээнийг удирдах боломжтой.</Empty>;
  const t = data.tournament;
  const eventId = data.events.some(e => e.id === selectedEvent) ? selectedEvent : "";
  const activeEvent = data.events.find(e => e.id === eventId);
  return <>
    <Link href="/admin" className="back-link"><ArrowLeft size={16} />Миний наадмууд</Link>
    <div className="tp-page-heading"><div><span className={"tp-badge " + (t.status === "published" ? "is-published" : "")}>{t.status === "published" ? "Нийтэлсэн" : "Ноорог · Зөвхөн танд харагдана"}</span><h1>{t.name}</h1><p>Оролцогч багууд → Спортын тэмцээнүүд → Бүх төрлийн оролцоо.</p></div><div className="tp-actions">
      {t.status === "published" && <Link className="button button-outline" href={"/tournaments/" + id}><ExternalLink size={16} />Нийтийн хуудас</Link>}
      <button className="button button-dark" onClick={publish} disabled={busy || pending}>{t.status === "published" ? <EyeOff size={17} /> : <Globe2 size={17} />}{busy ? "Хадгалж байна…" : t.status === "published" ? "Нийтлэлээс буулгах" : "Нийтлэх"}</button>
    </div></div>
    {actionError && <Notice error>{actionError}</Notice>}
    <div className="tp-tabs" aria-label="Тэмцээний удирдлага">{[["organizations", "1. Оролцогч багууд"], ["sports", "2. Спортын тэмцээнүүд"], ["participation", "Бүх төрлийн оролцоо"], ["overview", "Тохиргоо"]].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => { setTab(key); if (key === "sports") setSelectedEvent(""); }}>{label}</button>)}</div>
    {tab === "overview" && <div className="admin-overview"><TournamentEditor tournament={t} onSaved={reload} /><aside className="tp-panel admin-guide"><span className="section-kicker">БЭЛЭН БОЛГОХ АЛХМУУД</span><h2>Талбараа бэлдэе.</h2><ol><li>Үндсэн мэдээллээ оруул.</li><li>Оролцогчдоо нэр, логотой нь нэм.</li><li>Спортын тэмцээнүүддээ багуудаа бүртгэ.</li><li>Тоглолт, үр дүн, нийтлэлээ оруул.</li><li>Тэмцээнээ нийтлээд холбоосоо хуваалц.</li></ol><p>Нийтэлсний дараах өөрчлөлтүүд нийтийн хуудсанд харагдана.</p></aside></div>}
    {tab === "organizations" && <OrganizationsManager data={data} reload={reload} next={() => setTab("sports")} />}
    {tab === "sports" && (!activeEvent ? <SportsManager data={data} reload={reload} open={id => { setSelectedEvent(id); setSportTab("teams"); }} /> : <section>
      <button type="button" className="text-link festival-back" onClick={() => setSelectedEvent("")}><ArrowLeft size={16} />Бүх спортын тэмцээн</button>
      <div className="tp-panel-heading"><h2>{activeEvent.name}</h2><p>Энэ спортод оролцох багууд, тоглолт болон эцсийн байрыг удирдана.</p></div>
      <div className="tp-tabs" aria-label="Спортын тэмцээний удирдлага"><button type="button" aria-pressed={sportTab === "teams"} onClick={() => setSportTab("teams")}>Багууд ба байр</button><button type="button" aria-pressed={sportTab === "matches"} onClick={() => setSportTab("matches")}>Тоглолтын хуваарь</button></div>
      {sportTab === "teams" ? <TeamsManager key={eventId} data={data} eventId={eventId} reload={reload} showMatches={() => setSportTab("matches")} /> : <MatchesManager key={eventId} data={data} eventId={eventId} reload={reload} showTeams={() => setSportTab("teams")} />}
    </section>)}
    {tab === "participation" && <CompanyPointsManager data={data} reload={reload} onEvent={id => { setSelectedEvent(id); setSportTab("teams"); setTab("sports"); }} />}
  </>;
}

function ManagedForm({ title, children, save, onDone, reset = false }: { title: string; children: React.ReactNode; save: (data: FormData) => Promise<void>; onDone: () => void; reset?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget, values = new FormData(form);
    setBusy(true); setError(""); setSuccess(false);
    try { await save(values); if (reset) form.reset(); onDone(); setSuccess(true); }
    catch (error) { setError(dataError(error)); }
    finally { setBusy(false); }
  }
  return <form className="tp-panel tp-form" onSubmit={submit}><h2>{title}</h2><fieldset disabled={busy}>{children}<button type="submit" className="button button-dark"><Plus size={16} />{busy ? "Хадгалж байна…" : "Хадгалах"}</button></fieldset>{error && <Notice error>{error}</Notice>}{success && <Notice>Хадгалагдлаа.</Notice>}</form>;
}
function DeleteButton({ table, id, name, reload }: { table: string; id: string; name: string; reload: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function remove() {
    if (busy || !window.confirm('“' + name + '”-г устгах уу?')) return;
    setBusy(true); setError("");
    try {
      const { error } = await getSupabase().from(table).delete().eq("id", id).select("id").single();
      if (error) throw error;
      reload();
    } catch (error) { setError(dataError(error)); }
    finally { setBusy(false); }
  }
  return <><button className="tp-icon-button danger" type="button" disabled={busy} onClick={remove} aria-label={name + " устгах"}><Trash2 size={16} /></button>{error && <Notice error>{error}</Notice>}</>;
}
function requiredText(data: FormData, key: string) {
  const text = String(data.get(key) || "").trim();
  if (!text) throw new Error("UI:Нэрээ оруулна уу.");
  return text;
}
function TeamsManager({ data, eventId, reload, showMatches }: { data: TournamentData; eventId: string; reload: () => void; showMatches: () => void }) {
  const [editing, setEditing] = useState<Team | null>(null);
  const teams = data.teams.filter(t => t.tournament_event_id === eventId);
  if (!eventId) return <ManagedForm title="Спортын төрлөө сонгоорой" onDone={reload} save={async values => {
    const sport = String(values.get("sport"));
    const { error } = await getSupabase().from("tournament_events").insert({ tournament_id: data.tournament.id, name: sports[sport], sport, format: "other" }).select("id").single();
    if (error) throw error;
  }}><label htmlFor="setup-sport">Спортын төрөл</label><select id="setup-sport" name="sport">{Object.entries(sports).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></ManagedForm>;
  if (!data.organizations.length) return <Notice>Эхлээд «Оролцогч багууд» хэсэгт УУГ, Оффис зэрэг багуудаа нэмээрэй.</Notice>;
  return <div className="admin-management-grid">
    <ManagedForm key={editing?.id || "new-team"} title={editing ? "Баг засах" : "Баг нэмэх"} reset={!editing} onDone={() => { setEditing(null); reload(); }} save={async values => {
      const place = String(values.get("final_place") || "");
      const update = { name: requiredText(values, "name"), company_id: requiredText(values, "organization"), group_name: String(values.get("group_name") || "").trim() || null, final_place: place ? Number(place) : null, ...(data.events.find(e => e.id === eventId)?.sport === "chess" ? { result_points: String(values.get("result_points") || "") ? Number(values.get("result_points")) : null } : {}) };
      const query = editing ? getSupabase().from("teams").update(update).eq("id", editing.id) : getSupabase().from("teams").insert({ ...update, tournament_event_id: eventId });
      const { error } = await query.select("id").single(); if (error) throw error;
    }}><p className="tp-muted">УУГ 1, УУГ 2 зэрэг баг бүрийг харьяалах оролцогчтой нь холбоно.</p><label htmlFor="team-organization">Харьяалах оролцогч баг</label><select id="team-organization" name="organization" required defaultValue={editing?.company_id || ""}><option value="" disabled>Оролцогч сонгох</option>{data.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><label htmlFor="team-name">Багийн нэр</label><input id="team-name" name="name" required maxLength={120} defaultValue={editing?.name} placeholder="Жишээ: Бодь, Шонхорууд…" />
    <label htmlFor="team-group">Хэсэг (заавал биш)</label><input id="team-group" name="group_name" maxLength={60} defaultValue={editing?.group_name || ""} placeholder="Жишээ: Group A" />
    <label htmlFor="team-place">Эцсийн байр (менежер оруулна)</label><input id="team-place" name="final_place" type="number" min={1} max={9999} step={1} defaultValue={editing?.final_place ?? ""} placeholder="Байр тодроогүй бол хоосон" />
    {editing && <button type="button" className="text-link" onClick={() => setEditing(null)}>Засахаа болих</button>}</ManagedForm>
    <section className="tp-panel"><div className="tp-panel-heading"><h2>Оролцох багууд · {teams.length}</h2><p>Хоёроос доошгүй баг нэмээд тоглолтын хуваариа үүсгэнэ.</p></div>
      {teams.length ? teams.map(t => <div className="admin-team-row" key={t.id}><TeamLogo name={t.name} url={data.organizations.find(o => o.id === t.company_id)?.logo_url} /><div><strong>{t.name}</strong><small>{data.organizations.find(o => o.id === t.company_id)?.name || "Харьяалал сонгоогүй"}{t.final_place ? " · " + t.final_place + "-р байр" : ""}{t.group_name ? " · " + t.group_name : ""}</small></div><button className="tp-icon-button" type="button" onClick={() => setEditing(t)} aria-label={t.name + " засах"}><Pencil size={16} /></button><DeleteButton table="teams" id={t.id} name={t.name} reload={reload} /></div>) : <p className="tp-muted">Одоогоор баг нэмээгүй байна.</p>}
      {teams.length >= 2 && <button className="button button-lime admin-next" onClick={showMatches}>Дараагийн алхам: Хуваарь үүсгэх</button>}
    </section>
  </div>;
}
function MatchesManager({ data, eventId, reload, showTeams }: { data: TournamentData; eventId: string; reload: () => void; showTeams: () => void }) {
  const [editing, setEditing] = useState<Fixture | null>(null);
  const teams = data.teams.filter(t => t.tournament_event_id === eventId);
  const fixtures = data.fixtures.filter(m => m.tournament_event_id === eventId);
  if (!eventId || teams.length < 2) return <section className="tp-panel"><h2>Эхлээд хоёр баг нэмээрэй.</h2><p className="tp-muted">Тоглолт үүсгэхийн тулд оролцох багуудаа бүртгэнэ.</p><button className="button button-lime admin-next" onClick={showTeams}>Баг нэмэх</button></section>;
  if (data.fixturesUnavailable) return <Notice>Хуваарийн хэсгийн тохиргоо хийгдэж байна. Түр хүлээгээд дахин оролдоорой.</Notice>;
  return <><div className="admin-matches-layout">
    <FixtureGenerator eventId={eventId} teams={teams} reload={reload} />
    {teams.length >= 2 ? <ManagedForm key={eventId + (editing?.id || "new")} title={editing ? "Тоглолт засах" : "Тоглолт нэмэх"} reset={!editing} onDone={() => { setEditing(null); reload(); }} save={async values => {
      const home = String(values.get("home_team_id")), away = String(values.get("away_team_id"));
      if (home === away) throw new Error("UI:Хоёр өөр баг сонгоно уу.");
      const status = editing ? String(values.get("status")) : "scheduled";
      const h = String(values.get("home_score") || "").trim(), a = String(values.get("away_score") || "").trim();
      if (status === "scheduled" && (h || a)) throw new Error("UI:Оноотой тоглолтыг «Явагдаж байна» эсвэл «Дууссан» төлөвөөр хадгална. «Товлосон» болгох бол хоёр оноог хоосолно уу.");
      if (status !== "scheduled" && (!h || !a)) throw new Error("UI:Явагдаж буй болон дууссан тоглолтын хоёр багийн оноог оруулна уу.");
      const update = { tournament_event_id: eventId, home_team_id: home, away_team_id: away, round: String(values.get("round") || "").trim(), status, home_score: status === "scheduled" ? null : Number(h), away_score: status === "scheduled" ? null : Number(a) };
      const query = editing ? getSupabase().from("tournament_fixtures").update(update).eq("id", editing.id) : getSupabase().from("tournament_fixtures").insert(update);
      const { error } = await query.select("id").single(); if (error) throw error;
    }}><label htmlFor="home-team">Эхний баг</label><select id="home-team" name="home_team_id" required defaultValue={editing?.home_team_id || teams[0]?.id}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <label htmlFor="away-team">Хоёр дахь баг</label><select id="away-team" name="away_team_id" required defaultValue={editing?.away_team_id || teams[1]?.id}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <label htmlFor="match-round">Шат / тойрог</label><input id="match-round" name="round" maxLength={100} placeholder="Жишээ: Хагас шигшээ" defaultValue={editing?.round} />
      {editing && <MatchScoreFields fixture={editing} />}{editing && <button className="text-link" type="button" onClick={() => setEditing(null)}>Засахаа болих</button>}
    </ManagedForm> : <Empty title="Хоёроос доошгүй баг хэрэгтэй.">Багууд хэсэгт багуудаа нэмээрэй.</Empty>}
    <div className="tp-stack">{fixtures.length ? <MatchTable matches={fixtures} teams={data.teams} organizations={data.organizations} actions={m => <><button className="text-link" type="button" onClick={() => setEditing(m)}><Pencil size={14} />Тоглолт / оноо засах</button><DeleteButton table="tournament_fixtures" id={m.id} name="Тоглолт" reload={reload} /></>} /> : <Empty title="Тоглолтын хуваарь хоосон байна.">Хоёр багаа сонгоод эхний тоглолтоо нэмээрэй.</Empty>}</div>
  </div></>;
}

function MatchScoreFields({ fixture }: { fixture: Fixture }) {
  const [status, setStatus] = useState<Fixture["status"]>(fixture.status);
  function scoreChanged(value: string) {
    if (status === "scheduled" && value !== "") setStatus("completed");
  }
  return <>
    <label htmlFor="match-status">Тоглолтын төлөв</label>
    <select id="match-status" name="status" value={status} onChange={event => setStatus(event.target.value as Fixture["status"])}>
      <option value="scheduled">Товлосон</option><option value="live">Явагдаж байна</option><option value="completed">Дууссан</option>
    </select>
    <p id="match-score-help" className="tp-muted">Оноо оруулахад «Товлосон» төлөв «Дууссан» болно. Тоглолт үргэлжилж байвал «Явагдаж байна» сонгоно уу.</p>
    <div className="tp-form-columns">
      <div><label htmlFor="home-score">Эхний багийн оноо</label><input id="home-score" name="home_score" type="number" min={0} max={9999} step={0.5} defaultValue={fixture.home_score ?? ""} onChange={event => scoreChanged(event.target.value)} aria-describedby="match-score-help" /></div>
      <div><label htmlFor="away-score">Хоёр дахь багийн оноо</label><input id="away-score" name="away_score" type="number" min={0} max={9999} step={0.5} defaultValue={fixture.away_score ?? ""} onChange={event => scoreChanged(event.target.value)} aria-describedby="match-score-help" /></div>
    </div>
  </>;
}
