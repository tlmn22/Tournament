"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, RefreshCw, Trophy, UsersRound } from "lucide-react";

import { dateLabel, loadTournament, sports } from "@/lib/tournaments";
import { useRemote, Notice, Empty, MatchTable } from "./tournament-ui";
import { ParticipationTable } from "./participation-table";
import { ArticleFeed } from "./festival-articles";
import { FinalStandings } from "./final-standings";
import { GroupResults } from "./group-results";
import { buildGroupResults } from "@/lib/group-results";
import { TeamLogo } from "./festival-media";

export { TournamentDirectory as PublicTournaments } from "./tournament-directory";
export function PublicTournament({ id }: { id: string }) {
  const { data, pending, error, reload } = useRemote(() => loadTournament(id), [id]);
  const [eventId, setEventId] = useState("all");
  const [tab, setTab] = useState("schedule");
  const [resultsView, setResultsView] = useState("groups");
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reload(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [reload]);
  if (pending && !data) return <Notice>Тэмцээнийг ачаалж байна…</Notice>;
  if (error) return <Notice error>{error} <button onClick={reload}>Дахин оролдох</button></Notice>;
  if (!data) return <Empty title="Тэмцээн олдсонгүй.">Холбоос буруу эсвэл тэмцээн нийтлэгдээгүй байна. Нийтэлсэн тэмцээнүүдийг жагсаалтаас үзээрэй.</Empty>;
  const { tournament: t, events, teams, fixtures } = data;
  const selectedTeams = teams.filter(team => eventId === "all" || team.tournament_event_id === eventId);
  const selectedMatches = fixtures.filter(m => (eventId === "all" || m.tournament_event_id === eventId) && (tab !== "results" || m.status === "completed"));
  const live = fixtures.filter(m => m.status === "live").length;
  const resultGroups = tab === "results" ? buildGroupResults(data, eventId) : [];
  const showGroupResults = tab === "results" && resultGroups.length > 0 && resultsView === "groups";
  return <>
    <Link className="back-link" href="/tournaments"><ArrowLeft size={16} />Бүх тэмцээн</Link>
    <section className="tp-event-hero"><div><span className="tp-event-kicker">{live ? "● ТОГЛОЛТ ҮРГЭЛЖИЛЖ БАЙНА" : "ХАМТЫН ЯЛАЛТЫН ТАЛБАР"}</span><h1>{t.name}</h1><div className="tp-event-meta"><span><CalendarDays size={17} />{dateLabel(t.start_date)}{t.end_date && t.end_date !== t.start_date ? " — " + dateLabel(t.end_date) : ""}</span><span><UsersRound size={17} />{data.organizations.length} оролцогч · {teams.length} спортын баг</span><span><Trophy size={17} />{events.length} ангилал</span></div></div><Trophy className="tp-event-trophy" size={150} strokeWidth={.75} aria-hidden="true" /></section>
    <div className="tp-public-controls"><div className="tp-tabs" aria-label="Тэмцээний мэдээлэл">{[["schedule", "Тоглолтууд"], ["participation", "Багийн дүн"], ["results", "Үр дүн"], ["teams", "Багууд"], ["articles", "Нийтлэлүүд"], ["about", "Танилцуулга"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)} type="button">{label}</button>)}</div><button type="button" className="tp-refresh" onClick={reload} disabled={pending}><RefreshCw size={15} className={pending ? "tp-spin" : ""} />{pending ? "Шинэчилж байна…" : "Шинэчлэх"}</button></div>
    {["schedule", "results", "teams"].includes(tab) && events.length > 1 && <div className="tp-event-filters" aria-label="Спортын ангиллаар шүүх"><button type="button" aria-pressed={eventId === "all"} onClick={() => setEventId("all")}>Бүх ангилал</button>{events.map(e => <button key={e.id} type="button" aria-pressed={eventId === e.id} onClick={() => setEventId(e.id)}>{e.name}</button>)}</div>}
    {tab === "results" && resultGroups.length > 0 && <div className="tp-event-filters tp-result-views" aria-label="Үр дүн харах хэлбэр">
      <button type="button" aria-pressed={resultsView === "groups"} onClick={() => setResultsView("groups")}>Хэсгийн хүснэгт</button>
      <button type="button" aria-pressed={resultsView === "matches"} onClick={() => setResultsView("matches")}>Тоглолтын жагсаалт</button>
    </div>}
    {showGroupResults && <GroupResults groups={resultGroups} />}
    {tab === "results" && <FinalStandings data={data} eventId={eventId} />}
    {(tab === "schedule" || (tab === "results" && !showGroupResults)) && <><div className="tp-section-title"><h2>{tab === "schedule" ? "Тоглолтын хуваарь, үр дүн." : "Тоглолтын үр дүн."}</h2></div>
      {selectedMatches.length ? <MatchTable matches={[...selectedMatches].sort((a, b) => Number(b.status === "live") - Number(a.status === "live"))} teams={teams} events={events} organizations={data.organizations} /> : <Empty title={tab === "schedule" ? "Тоглолт хараахан нэмээгүй байна." : "Үр дүн хараахан гараагүй."}>{tab === "schedule" ? "Зохион байгуулагч хуваарь нэмэхэд энд харагдана." : "Дууссан тоглолтын оноо энд харагдана."}</Empty>}
    </>}
    {tab === "teams" && <><div className="tp-section-title"><h2>Өөр өөр баг. Нэг зорилго.</h2><span>{selectedTeams.length} баг</span></div>{selectedTeams.length ? <div className="tp-public-teams">{selectedTeams.map(team => <article className="tp-panel" key={team.id}><TeamLogo name={team.name} url={data.organizations.find(o => o.id === team.company_id)?.logo_url} /><h3>{team.name}</h3><p>{data.organizations.find(o => o.id === team.company_id)?.name || ""}{team.final_place ? " · " + team.final_place + "-р байр" : ""}</p><span className="tp-badge">{events.find(e => e.id === team.tournament_event_id)?.name}</span></article>)}</div> : <Empty title="Багууд удахгүй нэмэгдэнэ." />}</>}
    {tab === "participation" && <ParticipationTable data={data} onEvent={id => { setEventId(id); setTab("results"); }} />}
    {tab === "articles" && <ArticleFeed articles={data.articles} tournamentId={id} />}
    {tab === "about" && <div className="tp-about-grid"><section className="tp-panel"><h2>Тэмцээний тухай</h2><p className="tp-description">{t.description || "Дэлгэрэнгүй танилцуулга удахгүй нэмэгдэнэ."}</p></section><section className="tp-panel"><h2>Спортын ангиллууд</h2>{events.length ? events.map(e => <div className="tp-about-event" key={e.id}><strong>{e.name}</strong><span>{sports[e.sport] || e.sport}</span></div>) : <p className="tp-muted">Ангилал хараахан нэмээгүй.</p>}</section></div>}
  </>;
}
