"use client";
/* eslint-disable @next/next/no-img-element -- Uploaded cover images are served directly from Supabase. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, RefreshCw, Trophy, UsersRound } from "lucide-react";

import { dateLabel, loadTournament, sports, type Team, type TournamentData, type TournamentEvent } from "@/lib/tournaments";
import { SportIcon, type Sport } from "./sport-icon";
import { useRemote, Notice, Empty, MatchTable } from "./tournament-ui";
import { ParticipationTable } from "./participation-table";
import { FinalStandings } from "./final-standings";
import { GroupResults } from "./group-results";
import { buildGroupResults } from "@/lib/group-results";
import { TeamLogo } from "./festival-media";
import { safeImageUrl } from "@/lib/media";

export { TournamentDirectory as PublicTournaments } from "./tournament-directory";
export function PublicTournament({ id }: { id: string }) {
  const { data, pending, error, reload } = useRemote(() => loadTournament(id), [id]);
  const [eventId, setEventId] = useState("all");
  const [sportId, setSportId] = useState<string | null>(null);
  const [tab, setTab] = useState("participation");
  const [resultsView, setResultsView] = useState("groups");
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reload(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [reload]);
  const name = data?.tournament.name;
  useEffect(() => { if (name) document.title = name + " | temtseen.app"; }, [name]);
  const neon = data?.tournament.theme === "neon";
  useEffect(() => {
    if (!neon) return;
    document.body.classList.add("theme-neon");
    return () => document.body.classList.remove("theme-neon");
  }, [neon]);
  if (pending && !data) return <Notice>Тэмцээнийг ачаалж байна…</Notice>;
  if (error) return <Notice error>{error} <button onClick={reload}>Дахин оролдох</button></Notice>;
  if (!data) return <Empty title="Тэмцээн олдсонгүй.">Холбоос буруу эсвэл тэмцээн нийтлэгдээгүй байна. Нийтэлсэн тэмцээнүүдийг жагсаалтаас үзээрэй.</Empty>;
  const { tournament: t, events, teams, fixtures } = data;
  const selectedTeams = teams.filter(team => eventId === "all" || team.tournament_event_id === eventId);
  const selectedMatches = fixtures.filter(m => (eventId === "all" || m.tournament_event_id === eventId) && (tab !== "results" || m.status === "completed"));
  const live = fixtures.filter(m => m.status === "live").length;
  const resultGroups = tab === "results" ? buildGroupResults(data, eventId) : [];
  const hasFinalStandings = selectedTeams.some(team => team.final_place != null);
  const showGroupResults = tab === "results" && resultGroups.length > 0 && resultsView === "groups";
  const cover = safeImageUrl(t.cover_url);
  const selectedSport = events.find(e => e.id === sportId);
  const meta = <div className="tp-event-meta"><span><CalendarDays size={17} />{dateLabel(t.start_date)}{t.end_date && t.end_date !== t.start_date ? " — " + dateLabel(t.end_date) : ""}</span><span><UsersRound size={17} />{data.organizations.length} оролцогч · {teams.length} спортын баг</span><span><Trophy size={17} />{events.length} ангилал</span></div>;
  return <>
    <Link className="back-link" href="/tournaments"><ArrowLeft size={16} />Бүх тэмцээн</Link>
    {cover ? <><div className="tp-event-cover"><img src={cover} alt="" /></div><div className="tp-event-heading"><h1>{t.name}</h1>{meta}</div></> : <section className="tp-event-hero"><div>{live > 0 && <span className="tp-event-kicker">● ТОГЛОЛТ ҮРГЭЛЖИЛЖ БАЙНА</span>}<h1>{t.name}</h1>{meta}</div><Trophy className="tp-event-trophy" size={150} strokeWidth={.75} aria-hidden="true" /></section>}
    <div className="tp-public-controls"><div className="tp-tabs" aria-label="Тэмцээний мэдээлэл">{[["participation", "Багийн дүн"], ["schedule", "Спорт төрлүүд"], ["results", "Үр дүн"], ["teams", "Багууд"], ["about", "Танилцуулга"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => { setTab(key); if (key === "schedule") setSportId(null); }} type="button">{label}</button>)}</div><button type="button" className="tp-refresh" onClick={reload} disabled={pending}><RefreshCw size={15} className={pending ? "tp-spin" : ""} />{pending ? "Шинэчилж байна…" : "Шинэчлэх"}</button></div>
    {["results", "teams"].includes(tab) && events.length > 1 && <div className="tp-event-filters" aria-label="Спортын ангиллаар шүүх"><button type="button" aria-pressed={eventId === "all"} onClick={() => setEventId("all")}>Бүх ангилал</button>{events.map(e => <button key={e.id} type="button" aria-pressed={eventId === e.id} onClick={() => setEventId(e.id)}>{e.name}</button>)}</div>}
    {tab === "results" && resultGroups.length > 0 && <div className="tp-event-filters tp-result-views" aria-label="Үр дүн харах хэлбэр">
      <button type="button" aria-pressed={resultsView === "groups"} onClick={() => setResultsView("groups")}>Хэсгийн хүснэгт</button>
      <button type="button" aria-pressed={resultsView === "matches"} onClick={() => setResultsView("matches")}>Тоглолтын жагсаалт</button>
    </div>}
    {showGroupResults && <GroupResults groups={resultGroups} />}
    {tab === "results" && <FinalStandings data={data} eventId={eventId} />}
    {tab === "results" && !showGroupResults && (selectedMatches.length > 0 || !hasFinalStandings) && <><div className="tp-section-title"><h2>Тоглолтын үр дүн.</h2></div>
      {selectedMatches.length ? <MatchTable matches={selectedMatches} teams={teams} events={events} organizations={data.organizations} /> : <Empty title="Үр дүн хараахан гараагүй.">Дууссан тоглолтын оноо энд харагдана.</Empty>}
    </>}
    {tab === "schedule" && (selectedSport ? <SportDetail data={data} event={selectedSport} back={() => setSportId(null)} /> : <SportList data={data} open={setSportId} />)}
    {tab === "teams" && <ParticipantOrganizations data={data} teams={selectedTeams} />}
    {tab === "participation" && <ParticipationTable data={data} onEvent={id => { setEventId(id); setTab("results"); }} />}
    {tab === "about" && <div className="tp-about-grid"><section className="tp-panel"><h2>Тэмцээний тухай</h2><p className="tp-description">{t.description || "Дэлгэрэнгүй танилцуулга удахгүй нэмэгдэнэ."}</p></section><section className="tp-panel"><h2>Спортын ангиллууд</h2>{events.length ? events.map(e => <div className="tp-about-event" key={e.id}><strong>{e.name}</strong><span>{sports[e.sport] || e.sport}</span></div>) : <p className="tp-muted">Ангилал хараахан нэмээгүй.</p>}</section></div>}
  </>;
}

function ParticipantOrganizations({ data, teams }: { data: TournamentData; teams: Team[] }) {
  const groups = [...data.organizations.map(o => ({ id: o.id, name: o.name, logo: o.logo_url, teams: teams.filter(team => team.company_id === o.id) })), { id: "other", name: "Бусад", logo: null, teams: teams.filter(team => !data.organizations.some(o => o.id === team.company_id)) }].filter(g => g.teams.length);
  return <><div className="tp-section-title"><h2>Өөр өөр баг. Нэг зорилго.</h2><span>{groups.length} оролцогч · {teams.length} баг</span></div>
    {groups.length ? <div className="tp-public-teams">{groups.map(g => <details className="tp-panel tp-participant" key={g.id}><summary><TeamLogo name={g.name} url={g.logo} /><span className="tp-participant-name"><h3>{g.name}</h3><p>{g.teams.length} баг · {new Set(g.teams.map(team => team.tournament_event_id)).size} төрөл</p></span><ChevronDown className="tp-participant-icon" size={18} aria-hidden="true" /></summary>
      {data.events.filter(e => g.teams.some(team => team.tournament_event_id === e.id)).map(e => <div className="tp-participant-event" key={e.id}><span className="tp-badge">{e.name}</span><ul>{g.teams.filter(team => team.tournament_event_id === e.id).map(team => <li key={team.id}><span>{team.name}</span>{team.final_place ? <small>{team.final_place}-р байр</small> : null}</li>)}</ul></div>)}
    </details>)}</div> : <Empty title="Багууд удахгүй нэмэгдэнэ." />}</>;
}

const iconSports: Sport[] = ["basketball", "volleyball", "football", "esports"];
const sportIcon = (sport: string): Sport => iconSports.includes(sport as Sport) ? sport as Sport : "other";

function SportList({ data, open }: { data: TournamentData; open: (id: string) => void }) {
  if (!data.events.length) return <Empty title="Спорт төрөл хараахан нэмээгүй байна.">Зохион байгуулагч спортын тэмцээн нэмэхэд энд харагдана.</Empty>;
  return <><div className="tp-section-title"><h2>Спорт төрлүүд.</h2><span>{data.events.length} төрөл</span></div>
    <div className="tp-sport-grid">{data.events.map(event => {
      const teams = data.teams.filter(t => t.tournament_event_id === event.id);
      const matches = data.fixtures.filter(m => m.tournament_event_id === event.id);
      const live = matches.some(m => m.status === "live");
      const winner = teams.find(t => t.final_place === 1);
      return <button type="button" className="tp-panel tp-sport-card" key={event.id} onClick={() => open(event.id)}>
        <span className="tp-sport-card-icon"><SportIcon sport={sportIcon(event.sport)} size={26} /></span>
        <span className="tp-sport-card-body">
          <strong>{event.name}</strong>
          <small>{sports[event.sport] || event.sport} · {teams.length} баг · {matches.length} тоглолт</small>
          {winner && <small className="tp-sport-card-winner"><Trophy size={13} aria-hidden="true" />{winner.name}</small>}
        </span>
        {live && <span className="tp-badge match-live">Явагдаж байна</span>}
        <ChevronRight className="tp-sport-card-arrow" size={18} aria-hidden="true" />
      </button>;
    })}</div></>;
}

function SportDetail({ data, event, back }: { data: TournamentData; event: TournamentEvent; back: () => void }) {
  const teams = data.teams.filter(t => t.tournament_event_id === event.id);
  const matches = data.fixtures.filter(m => m.tournament_event_id === event.id).sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
  const groups = buildGroupResults(data, event.id);
  const completed = matches.filter(m => m.status === "completed").length;
  return <>
    <button type="button" className="back-link tp-sport-back" onClick={back}><ArrowLeft size={16} />Бүх спорт төрөл</button>
    <section className="tp-panel tp-sport-head">
      <span className="tp-sport-card-icon"><SportIcon sport={sportIcon(event.sport)} size={30} /></span>
      <div><h2>{event.name}</h2><p className="tp-muted">{sports[event.sport] || event.sport} · {teams.length} баг · {matches.length} тоглолт · {completed} дууссан</p></div>
    </section>
    <FinalStandings data={data} eventId={event.id} />
    {groups.length > 0 && <GroupResults groups={groups} />}
    <div className="tp-section-title"><h2>Тоглолтын хуваарь, үр дүн.</h2></div>
    {matches.length ? <MatchTable matches={matches} teams={data.teams} events={data.events} organizations={data.organizations} /> : <Empty title="Тоглолт хараахан нэмээгүй байна.">Зохион байгуулагч хуваарь нэмэхэд энд харагдана.</Empty>}
    <div className="tp-sport-teams"><ParticipantOrganizations data={data} teams={teams} /></div>
  </>;
}
