import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Тэмцээнүүд" };

export default function TournamentsPage() {
  return <><SiteHeader /><main id="main-content" className="subpage"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={16} /> Нүүр хуудас</Link><div className="subpage-heading"><span className="section-kicker">ТЭМЦЭЭН БҮР ӨӨРИЙН ТҮҮХТЭЙ</span><h1>Дараагийн догдлолоо<br />эндээс олоорой.</h1><p>Байгууллагын наадам, жижиг лиг, esports. Системд бүртгэгдсэн тэмцээнүүдтэй энэ хуудаснаас танилцана.</p></div><div className="empty-tournaments"><span className="empty-icon"><Trophy size={31} strokeWidth={1.5} /></span><h2>Тэмцээний талбар удахгүй нээгдэнэ</h2><p>Бид анхны тэмцээнүүдээ хүлээн авахад бэлдэж байна. Тэмцээнүүд нийтлэгдмэгц тэдгээрийн баг, хуваарь, үр дүнг эндээс үзэх боломжтой болно.</p><Link href="/#features" className="button button-outline">Боломжуудтай танилцах <ArrowUpRight size={17} /></Link></div></div></main><SiteFooter /></>;
}
