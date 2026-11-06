"use client";
import Link from "next/link";
import { Plus, Trophy, Globe2, FilePenLine } from "lucide-react";
import { useAuth } from "./auth-provider";
import { getSupabase } from "@/lib/supabase";
import type { Tournament } from "@/lib/tournaments";
import { useRemote, Notice, Empty, TournamentCard } from "./tournament-ui";

export function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, pending, reload } = useRemote(async () => {
    if (!user) return [];
    const { data, error } = await getSupabase().from("tournaments").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data as Tournament[];
  }, [user?.id]);
  const tournaments = data || [];
  return <>
    <div className="tp-page-heading"><div><span className="section-kicker">ТАНЫ ЗОХИОН БАЙГУУЛАХ ОРОН ЗАЙ</span><h1>Миний наадмууд<span className="heading-dot">.</span></h1><p>Санаанаас эхний тоглолт хүртэл. Бүх зүйл энд.</p></div><Link href="/admin/new" className="button button-dark"><Plus size={18} />Наадам үүсгэх</Link></div>
    <div className="admin-stats">{[{ label: "Нийт тэмцээн", value: tournaments.length, icon: Trophy }, { label: "Нийтэлсэн", value: tournaments.filter(t => t.status === "published").length, icon: Globe2 }, { label: "Ноорог", value: tournaments.filter(t => t.status !== "published").length, icon: FilePenLine }].map(s => <div key={s.label}><s.icon size={22} /><span>{s.label}</span><strong>{pending ? "—" : s.value}</strong></div>)}</div>
    {pending ? <Notice>Тэмцээнүүдийг ачаалж байна…</Notice> : error ? <Notice error>{error} <button type="button" onClick={reload}>Дахин оролдох</button></Notice> : tournaments.length ? <div className="tp-card-grid">{tournaments.map(t => <TournamentCard key={t.id} tournament={t} admin />)}</div> : <Empty title="Анхны тэмцээнээ бүтээе.">Тэмцээн үүсгээд багуудаа нэмээрэй. Бэлэн болохоороо нийтлэх боломжтой.</Empty>}
  </>;
}
