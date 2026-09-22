import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Trophy } from "lucide-react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function AccountPreview({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  return <><SiteHeader /><main id="main-content" className="subpage"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={16} /> Нүүр хуудас</Link><div className="auth-shell"><div className="auth-art"><Trophy size={43} strokeWidth={1.4} /><h2>Нэг талбар.<br />Олон боломж.<br />Хамтын ялалт.</h2><p>Тэмцээн бүрийн ард нэг хамт олон,<br />хамтдаа бүтээх нэг түүх бий.</p><div className="auth-orbit" aria-hidden="true" /></div><div className="auth-content"><span className="auth-status"><span className="tiny-dot" /> УДАХГҮЙ НЭЭГДЭНЭ</span><h1>{registering ? "Tournament-д нэгдэх" : "Дахин уулзахад таатай байна"}</h1><p>{registering ? "Хэрэглэгчийн бүртгэл удахгүй нээгдэнэ. Тэр хүртэл өөрийн дараагийн тэмцээнийг хэрхэн зохион байгуулахаа манай боломжуудаас сонирхоорой." : "Нэвтрэх хэсэг удахгүй нээгдэнэ. Одоогоор системийн боломжууд болон тэмцээний танилцуулгатай танилцах боломжтой."}</p><Link href="/#features" className="button button-lime">Боломжуудтай танилцах <ArrowUpRight size={17} /></Link><p className="auth-switch">{registering ? "Бүртгэлтэй юу? " : "Анх удаа зочилж байна уу? "}<Link href={registering ? "/login" : "/register"}>{registering ? "Нэвтрэх" : "Бүртгүүлэх"}</Link></p></div></div></div></main><SiteFooter /></>;
}
