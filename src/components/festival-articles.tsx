"use client";
/* eslint-disable @next/next/no-img-element -- Public user-uploaded images are served directly from Supabase. */
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Newspaper } from "lucide-react";
import { dateLabel, loadTournament, type Article } from "@/lib/tournaments";
import { safeImageUrl } from "@/lib/media";
import { Empty, Notice, useRemote } from "./tournament-ui";

export function ArticleFeed({ articles, tournamentId }: { articles: Article[]; tournamentId: string }) {
  if (!articles.length) return <Empty title="Наадмын түүх энд үргэлжилнэ.">Нэгтгэл нийтлэл, онцлох мөчүүд удахгүй нэмэгдэнэ.</Empty>;
  return <div className="festival-article-grid">{articles.map(article => <Link className="festival-article-card" href={"/tournaments/" + tournamentId + "/articles/" + article.id} key={article.id}>
    {safeImageUrl(article.cover_url) ? <img className="festival-article-cover" src={safeImageUrl(article.cover_url)!} alt="" loading="lazy" /> : <div className="festival-article-placeholder"><Newspaper size={48} /></div>}
    <div><span className="section-kicker">НААДМЫН ТЭМДЭГЛЭЛ · {dateLabel(article.published_at || article.created_at)}</span><h2>{article.title}</h2><p>{article.body.replace(/^#+\s/gm, "").slice(0, 170)}{article.body.length > 170 ? "…" : ""}</p><span className="tp-card-link">Нийтлэл унших <ArrowUpRight size={17} /></span></div>
  </Link>)}</div>;
}
export function ArticleView({ article }: { article: Article }) {
  return <article className="festival-story">
    <header><span className="section-kicker">НААДМЫН ТЭМДЭГЛЭЛ{article.status === "draft" ? " · НООРОГ" : ""}</span><h1>{article.title || "Нийтлэлийн гарчиг"}</h1><p className="tp-muted">{dateLabel(article.published_at || article.created_at)}</p></header>
    {safeImageUrl(article.cover_url) && <img className="festival-story-cover" src={safeImageUrl(article.cover_url)!} alt={article.title} />}
    <div className="festival-story-body">{article.body.split(/\n\s*\n/).filter(Boolean).map((block, index) => {
      if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
      if (block.startsWith("> ")) return <blockquote key={index}>{block.slice(2)}</blockquote>;
      return <p key={index}>{block}</p>;
    })}</div>
    {article.image_urls.length > 0 && <section className="festival-story-gallery" aria-label="Наадмын гэрэл зургууд">{article.image_urls.map((url, index) => safeImageUrl(url) && <figure key={url}><img src={safeImageUrl(url)!} alt={article.title + " — зураг " + (index + 1)} loading="lazy" /></figure>)}</section>}
  </article>;
}
export function PublicArticle({ tournamentId, articleId }: { tournamentId: string; articleId: string }) {
  const { data, pending, error, reload } = useRemote(() => loadTournament(tournamentId), [tournamentId]);
  const article = data?.articles.find(a => a.id === articleId);
  return <><Link className="back-link" href={"/tournaments/" + tournamentId}><ArrowLeft size={16} />Наадмын хуудас</Link>
    {pending ? <Notice>Нийтлэлийг ачаалж байна…</Notice> : error ? <Notice error>{error}<button onClick={reload}>Дахин оролдох</button></Notice> : article ? <ArticleView article={article} /> : <Empty title="Нийтлэл олдсонгүй.">Нийтлэл нийтлэгдээгүй эсвэл холбоос буруу байна.</Empty>}
  </>;
}
