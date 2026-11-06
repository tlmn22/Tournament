"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, ArrowUpRight, UserRound } from "lucide-react";
import { Brand } from "./brand";
import { useAuth } from "./auth-provider";
import { Notice } from "./tournament-ui";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const pathname = usePathname();
  return <div className="admin-app">
    <a className="skip-link" href="#main-content">Үндсэн агуулга руу очих</a>
    <aside className="admin-sidebar"><Brand /><span className="admin-workspace-label">ЗОХИОН БАЙГУУЛАГЧ</span><nav aria-label="Удирдлагын цэс">
      <Link className={pathname === "/admin" || pathname.startsWith("/admin/tournaments") ? "active" : ""} href="/admin"><LayoutDashboard size={18} />Миний наадмууд</Link>
      <Link className={pathname === "/admin/new" ? "active" : ""} href="/admin/new"><Plus size={18} />Наадам үүсгэх</Link>
      <Link href="/tournaments"><ArrowUpRight size={18} />Нийтийн хуудас</Link>
    </nav><div className="admin-account"><UserRound size={18} /><Link href="/login">{user?.email || "Миний бүртгэл"}</Link></div></aside>
    <div className="admin-main"><header className="admin-topbar"><span>Таны тэмцээн. Таны удирдлага.</span><Link href="/">Нүүр хуудас <ArrowUpRight size={15} /></Link></header>
      <main id="main-content" className="admin-content">
        {loading ? <Notice>Бүртгэлийн төлөв шалгаж байна…</Notice> : error ? <Notice error>{error}</Notice> : !user ? <section className="admin-login"><span className="section-kicker">ЗОХИОН БАЙГУУЛАГЧИЙН ХЭСЭГ</span><h1>Тэмцээнээ эндээс удирдаарай.</h1><p>Бүртгэлтэй хэрэглэгч бүр тэмцээн үүсгэж, өөрийн тэмцээний баг, хуваарь, үр дүнг удирдах боломжтой.</p><div className="tp-actions"><Link className="button button-lime" href="/login">Нэвтрэх</Link><Link className="button button-outline" href="/register">Бүртгүүлэх</Link></div></section> : <div key={user.id}>{children}</div>}
      </main>
    </div>
  </div>;
}
