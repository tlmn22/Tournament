"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
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
const priority: Record<Phase, number> = { ongoing: 0, upcoming: 1, undated: 2, completed: 3 };
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

function SortIcon({ active, ascending }: { active: boolean; ascending: boolean }) {
  const Icon = !active ? ArrowUpDown : ascending ? ArrowUp : ArrowDown;
  return <Icon size={14} aria-hidden="true" />;
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
  const visible = (data || []).filter(t => t.name.toLocaleLowerCase("mn").includes(query) && (filter === "all" || phaseOf(t, today) === filter))
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
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  function changeSort(key: SortKey) {
    setSort(previous => ({ key, ascending: previous.key === key ? !previous.ascending : key === "name" }));
    setPage(1);
  }

  return <section className="tp-directory" aria-labelledby="directory-title">
    <div className="tp-directory-heading"><h1 id="directory-title">Тэмцээнүүд</h1><span>{data ? data.length + " тэмцээн" : ""}</span></div>
    <div className="tp-directory-tools">
      <label className="tp-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Тэмцээн хайх</span><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} type="search" placeholder="Тэмцээний нэрээр хайх…" /></label>
      <label className="tp-directory-filter"><span className="sr-only">Тэмцээний төлөв</span><select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">Бүх тэмцээн</option>{Object.entries(phases).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {pending || !today ? <Notice>Тэмцээнүүдийг ачаалж байна…</Notice>
      : error ? <Notice error>{error} <button type="button" onClick={reload}>Дахин оролдох</button></Notice>
      : <div className="tp-directory-scroll" role="region" aria-label="Тэмцээнүүдийн хүснэгт" tabIndex={0}>
        <table className="tp-directory-table">
          <caption className="sr-only">Нийтлэгдсэн тэмцээнүүд. Тэмцээний нэр дээр дарж дэлгэрэнгүйг үзнэ үү.</caption>
          <thead><tr>
            <th scope="col" className="tp-directory-number">№</th>
            <th scope="col" aria-sort={sort.key === "name" ? sort.ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort("name")}>Тэмцээн <SortIcon active={sort.key === "name"} ascending={sort.ascending} /></button></th>
            <th scope="col">Төлөв</th>
            <th scope="col" className="tp-directory-date-heading" aria-sort={sort.key === "date" ? sort.ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort("date")}>Хугацаа <SortIcon active={sort.key === "date"} ascending={sort.ascending} /></button></th>
            <th scope="col" className="tp-directory-arrow"><span className="sr-only">Дэлгэрэнгүй</span></th>
          </tr></thead>
          <tbody>{visible.length ? visible.slice(offset, offset + pageSize).map((t, index) => {
            const phase = phaseOf(t, today);
            return <tr key={t.id}>
              <td className="tp-directory-number">{offset + index + 1}</td>
              <th scope="row"><Link className="tp-directory-link" href={"/tournaments/" + t.id}>{t.name}</Link><span className="tp-directory-mobile-date">{periodLabel(t)}</span></th>
              <td><span className={"tp-directory-status is-" + phase}>{phases[phase]}</span></td>
              <td className="tp-directory-dates">{periodLabel(t)}</td>
              <td className="tp-directory-arrow"><ChevronRight size={17} aria-hidden="true" /></td>
            </tr>;
          }) : <tr><td colSpan={5} className="tp-directory-empty" role="status">{search || filter !== "all" ? "Хайлт, шүүлтэд тохирох тэмцээн олдсонгүй." : "Нийтлэгдсэн тэмцээн хараахан алга."}</td></tr>}</tbody>
        </table>
      </div>}
    {!pending && !error && data && <div className="tp-directory-pagination">
      <span role="status">{visible.length ? (offset + 1) + "–" + Math.min(offset + pageSize, visible.length) + " / " + visible.length + " тэмцээн" : "0 тэмцээн"}</span>
      {pages > 1 && <nav aria-label="Тэмцээнүүдийн хуудсууд"><button type="button" aria-label="Өмнөх хуудас" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>{currentPage} / {pages}</span><button type="button" aria-label="Дараагийн хуудас" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></nav>}
    </div>}
  </section>;
}