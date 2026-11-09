"use client";
/* eslint-disable @next/next/no-img-element -- Uploaded cover images are served directly from Supabase. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { safeImageUrl } from "@/lib/media";
import { dateLabel, type Tournament } from "@/lib/tournaments";
import { Notice, useRemote } from "./tournament-ui";

type Phase = "ongoing" | "completed" | "upcoming" | "undated";
type SortKey = "default" | "name" | "date";
const phases: Record<Phase, string> = {
  ongoing: "Явагдаж байна",
  completed: "Дууссан",
  upcoming: "Удахгүй",
  undated: "Хугацаа товлоогүй",
};
const chipLabels: [string, string][] = [["all", "Бүгд"], ["ongoing", "Явагдаж байна"], ["upcoming", "Удахгүй"], ["undated", "Товлоогүй"], ["completed", "Дууссан"]];
const sortOptions: [string, string][] = [["default", "Төлөв, огноогоор"], ["name-asc", "Нэрээр (А–Я)"], ["name-desc", "Нэрээр (Я–А)"], ["date-desc", "Огноо (сүүлийнх нь эхэнд)"], ["date-asc", "Огноо (эртийнх нь эхэнд)"]];
const priority: Record<Phase, number> = { ongoing: 0, upcoming: 1, undated: 2, completed: 3 };
const tones = ["is-forest", "is-lime", "is-mint"];
const pageSize = 20;

function todayInMongolia() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}

function phaseOf(t: Tournament, today: string): Phase {
  if (t.end_date && t.end_date < today) return "completed";
  if (t.start_date && t.start_date > today) return "upcoming";
  if (t.start_date && t.start_date <= today) return "ongoing";
  return "undated";
}

function periodLabel(t: Tournament) {
  if (!t.start_date && !t.end_date) return "—";
  if (!t.start_date) return dateLabel(t.end_date) + " хүртэл";
  if (!t.end_date || t.start_date === t.end_date) return dateLabel(t.start_date);
  return dateLabel(t.start_date) + " – " + dateLabel(t.end_date);
}

// Whole calendar days between two YYYY-MM-DD dates.
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

function relativeLabel(t: Tournament, phase: Phase, today: string) {
  if (phase === "ongoing" && t.end_date) {
    const days = daysBetween(today, t.end_date);
    return days === 0 ? "Өнөөдөр дуусна" : days === 1 ? "Маргааш дуусна" : days + " хоногийн дараа дуусна";
  }
  if (phase === "upcoming" && t.start_date) {
    const days = daysBetween(today, t.start_date);
    return days === 1 ? "Маргааш эхэлнэ" : days + " хоногийн дараа эхэлнэ";
  }
  return "";
}

function progressOf(t: Tournament, today: string) {
  if (!t.start_date || !t.end_date) return null;
  const total = daysBetween(t.start_date, t.end_date) + 1, day = daysBetween(t.start_date, today) + 1;
  return { label: total + " өдрийн " + day + "-р өдөр", percent: Math.min(100, Math.round(day / total * 100)) };
}

const initialOf = (name: string) => name.trim().charAt(0).toLocaleUpperCase("mn");
const toneOf = (name: string) => tones[(name.trim().codePointAt(0) || 0) % tones.length];

async function loadPublishedTournaments() {
  const tournaments: Tournament[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await getSupabase().from("tournaments").select("*")
      .eq("status", "published").order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (error) throw error;
    tournaments.push(...data as Tournament[]);
    if (data.length < 1000) return tournaments;
  }
}

function pageNumbers(current: number, pages: number) {
  const numbers = [...new Set([1, current - 1, current, current + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return numbers.flatMap((n, i) => i && n - numbers[i - 1] > 1 ? ["gap-" + n, n] : [n]);
}

function FeaturedTournament({ t, today }: { t: Tournament; today: string }) {
  const cover = safeImageUrl(t.cover_url), progress = progressOf(t, today), relative = relativeLabel(t, "ongoing", today);
  return <article className="tp-dir-feature">
    <div className="tp-dir-feature-media">
      {cover ? <img src={cover} alt="" /> : <div className="tp-dir-mono" aria-hidden="true"><span>{initialOf(t.name)}</span></div>}
      <span className="tp-dir-badge is-ongoing tp-dir-badge-media">{phases.ongoing}</span>
    </div>
    <div className="tp-dir-feature-body">
      <div className="tp-dir-feature-text">
        <h3><Link className="tp-dir-feature-link" href={"/tournaments/" + t.id}>{t.name}</Link></h3>
        <div className="tp-dir-meta"><span><CalendarDays size={16} aria-hidden="true" />{periodLabel(t)}</span>{relative && <span><Clock3 size={16} aria-hidden="true" />{relative}</span>}</div>
        {progress && <div className="tp-dir-progress-row"><div className="tp-dir-progress" aria-hidden="true"><i style={{ width: progress.percent + "%" }} /></div><span>{progress.label}</span></div>}
      </div>
      <span className="tp-dir-cta" aria-hidden="true">Дэлгэрэнгүй үзэх<ArrowRight size={18} /></span>
    </div>
  </article>;
}

export function TournamentDirectory() {
  const { data, pending, error, reload } = useRemote(loadPublishedTournaments, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: "default", ascending: false });
  const [page, setPage] = useState(1);
  const [today, setToday] = useState("");
  useEffect(() => {
    const updateDay = () => setToday(todayInMongolia());
    const initial = window.setTimeout(updateDay, 0);
    const timer = window.setInterval(updateDay, 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);

  const query = search.toLocaleLowerCase("mn").trim();
  const all = data || [];
  const counts: Record<string, number> = { all: all.length, ongoing: 0, completed: 0, upcoming: 0, undated: 0 };
  for (const t of all) counts[phaseOf(t, today)]++;
  const visible = all.filter(t => t.name.toLocaleLowerCase("mn").includes(query) && (filter === "all" || phaseOf(t, today) === filter))
    .sort((a, b) => {
      if (sort.key === "name") return (sort.ascending ? 1 : -1) * a.name.localeCompare(b.name, "mn") || a.id.localeCompare(b.id);
      if (sort.key === "date") {
        if (!a.start_date && b.start_date) return 1;
        if (a.start_date && !b.start_date) return -1;
        return (sort.ascending ? 1 : -1) * (a.start_date || "").localeCompare(b.start_date || "") || a.name.localeCompare(b.name, "mn");
      }
      return priority[phaseOf(a, today)] - priority[phaseOf(b, today)]
        || (b.start_date || b.created_at).localeCompare(a.start_date || a.created_at)
        || a.name.localeCompare(b.name, "mn");
    });
  const featured = all.filter(t => phaseOf(t, today) === "ongoing").sort((a, b) => (b.start_date || "").localeCompare(a.start_date || "") || a.name.localeCompare(b.name, "mn"));
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const sortValue = sort.key === "default" ? "default" : sort.key + (sort.ascending ? "-asc" : "-desc");
  const ariaSort = (key: SortKey) => sort.key === key ? sort.ascending ? "ascending" : "descending" : "none";
  function changeSort(key: SortKey) {
    setSort(previous => ({ key, ascending: previous.key === key ? !previous.ascending : key === "name" }));
    setPage(1);
  }
  function chooseSort(value: string) {
    const [key, direction] = value.split("-");
    setSort({ key: key as SortKey, ascending: direction === "asc" });
    setPage(1);
  }
  const ready = !pending && !!today && !error && !!data;

  return <section className="tp-directory" aria-labelledby="directory-title">
    <div className="tp-dir-intro">
      <h1 id="directory-title">Тэмцээнүүд {data && <span className="tp-dir-count">{data.length} тэмцээн</span>}</h1>
      <p>Нийтлэгдсэн тэмцээнүүдийн хугацаа, явцыг эндээс харж, дэлгэрэнгүй рүү нь орно уу.</p>
    </div>
    {pending || !today ? <Notice>Тэмцээнүүдийг ачаалж байна…</Notice>
      : error ? <Notice error>{error} <button type="button" onClick={reload}>Дахин оролдох</button></Notice> : null}
    {ready && featured.length > 0 && <section className="tp-dir-section" aria-labelledby="live-title">
      <div className="tp-dir-section-head"><h2 id="live-title"><span className="tp-dir-live-dot" aria-hidden="true" />Одоо явагдаж байна</h2></div>
      <div className="tp-dir-features">{featured.map(t => <FeaturedTournament key={t.id} t={t} today={today} />)}</div>
    </section>}
    {ready && <section className="tp-dir-section" aria-labelledby="all-title">
      <div className="tp-dir-section-head">
        <h2 id="all-title">Бүх тэмцээн</h2>
        <label className="tp-dir-sort-select"><span>Эрэмбэ</span><select value={sortValue} onChange={event => chooseSort(event.target.value)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="tp-dir-panel">
        <div className="tp-dir-toolbar" role="search">
          <label className="tp-dir-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Тэмцээн хайх</span><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} type="search" placeholder="Тэмцээний нэрээр хайх" /></label>
          <div className="tp-dir-chips" role="group" aria-label="Тэмцээний төлөв">{chipLabels.map(([value, label]) => <button key={value} type="button" className="tp-dir-chip" aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>{label} <b>{counts[value]}</b></button>)}</div>
        </div>
        <div className="tp-dir-table-wrap" role="region" aria-label="Тэмцээнүүдийн хүснэгт" tabIndex={0}>
          <table className="tp-dir-table">
            <caption className="sr-only">Нийтлэгдсэн тэмцээнүүд. Тэмцээний нэр дээр дарж дэлгэрэнгүйг үзнэ үү.</caption>
            <thead><tr>
              <th scope="col" aria-sort={ariaSort("name")}><button type="button" className="tp-dir-sort" onClick={() => changeSort("name")}>Тэмцээн<ArrowUpDown size={15} aria-hidden="true" /></button></th>
              <th scope="col">Төлөв</th>
              <th scope="col" aria-sort={ariaSort("date")}><button type="button" className="tp-dir-sort" onClick={() => changeSort("date")}>Хугацаа<ArrowUpDown size={15} aria-hidden="true" /></button></th>
              <th scope="col"><span className="sr-only">Нээх</span></th>
            </tr></thead>
            <tbody>{visible.length ? visible.slice(offset, offset + pageSize).map(t => {
              const phase = phaseOf(t, today), cover = safeImageUrl(t.cover_url), relative = relativeLabel(t, phase, today);
              return <tr key={t.id}>
                <td className="tp-dir-name"><div className="tp-dir-name-cell"><span className={"tp-dir-thumb " + toneOf(t.name)} aria-hidden="true">{cover ? <img src={cover} alt="" /> : initialOf(t.name)}</span><Link className="tp-dir-row-link" href={"/tournaments/" + t.id}>{t.name}</Link></div></td>
                <td className="tp-dir-status"><span className={"tp-dir-badge is-" + phase}>{phases[phase]}</span></td>
                <td className="tp-dir-dates"><span>{periodLabel(t)}</span>{relative && <small>{relative}</small>}</td>
                <td className="tp-dir-chevron" aria-hidden="true"><ChevronRight size={18} /></td>
              </tr>;
            }) : <tr><td colSpan={4} className="tp-dir-empty" role="status">{search || filter !== "all" ? "Хайлт, шүүлтэд тохирох тэмцээн олдсонгүй." : "Нийтлэгдсэн тэмцээн хараахан алга."}</td></tr>}</tbody>
          </table>
        </div>
        <div className="tp-dir-foot">
          <span role="status">{visible.length ? (offset + 1) + "–" + Math.min(offset + pageSize, visible.length) + " / " + visible.length + " тэмцээн" : "0 тэмцээн"}</span>
          {pages > 1 && <nav className="tp-dir-pager" aria-label="Тэмцээнүүдийн хуудсууд">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} aria-hidden="true" />Өмнөх</button>
            {pageNumbers(currentPage, pages).map(n => typeof n === "string" ? <span key={n} className="tp-dir-gap" aria-hidden="true">…</span> : <button key={n} type="button" aria-current={n === currentPage ? "page" : undefined} aria-label={n + "-р хуудас"} onClick={() => setPage(n)}>{n}</button>)}
            <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Дараах<ChevronRight size={16} aria-hidden="true" /></button>
          </nav>}
        </div>
      </div>
    </section>}
  </section>;
}
