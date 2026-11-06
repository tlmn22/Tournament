"use client";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { dataError, type Article, type TournamentData } from "@/lib/tournaments";
import { ImageUpload } from "./festival-media";
import { ArticleView } from "./festival-articles";
import { Notice } from "./tournament-ui";

export function ArticleManager({ data, reload }: { data: TournamentData; reload: () => void }) {
  const [editing, setEditing] = useState<Article | null>(null);
  if (data.articlesUnavailable) return <Notice>Нийтлэлийн хэсэг хараахан бэлэн болоогүй байна.</Notice>;
  return <div className="festival-editor-layout"><ArticleEditor key={editing?.id || "new"} tournamentId={data.tournament.id} article={editing} cancel={() => setEditing(null)} saved={() => { setEditing(null); reload(); }} /><aside className="tp-panel"><h2>Наадмын нийтлэлүүд</h2><p className="tp-muted">Ноорог нийтлэл зөвхөн танд харагдана.</p>{data.articles.map(a => <div className="festival-article-list-item" key={a.id}><span className="tp-badge">{a.status === "published" ? "Нийтэлсэн" : "Ноорог"}</span><h3>{a.title}</h3><button type="button" className="text-link" onClick={() => setEditing(a)}>Нийтлэл засах</button></div>)}{!data.articles.length && <p className="tp-muted">Эхний нийтлэлээ бичээрэй.</p>}</aside></div>;
}
function ArticleEditor({ tournamentId, article, cancel, saved }: { tournamentId: string; article: Article | null; cancel: () => void; saved: () => void }) {
  const [title, setTitle] = useState(article?.title || ""), [body, setBody] = useState(article?.body || "");
  const [cover, setCover] = useState<string | null>(article?.cover_url || null), [images, setImages] = useState<string[]>(article?.image_urls || []);
  const [status, setStatus] = useState<"draft" | "published">(article?.status || "draft");
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || uploading) return;
    if (!title.trim() || (status === "published" && !body.trim())) { setError("Гарчиг болон нийтлэх агуулгаа оруулна уу."); return; }
    setBusy(true); setError("");
    try {
      const publishedAt = status === "published" ? article?.published_at || new Date().toISOString() : null;
      const values = { title: title.trim(), body: body.trim(), cover_url: cover, image_urls: images, status, published_at: publishedAt };
      const query = article ? getSupabase().from("tournament_articles").update(values).eq("id", article.id) : getSupabase().from("tournament_articles").insert({ ...values, tournament_id: tournamentId });
      const { error } = await query.select("id").single(); if (error) throw error;
      setTitle(""); setBody(""); setCover(null); setImages([]); setStatus("draft"); saved();
    } catch (error) { setError(dataError(error)); } finally { setBusy(false); }
  }
  return <div><form className="tp-panel tp-form" onSubmit={submit}><div className="tp-panel-heading"><h2>{article ? "Нийтлэл засах" : "Зурагтай нийтлэл бичих"}</h2><p>Наадмын тойм, онцлох мөч, эцсийн нэгтгэлээ энд бичээрэй.</p></div><fieldset disabled={busy || uploading}>
    <label htmlFor="article-title">Нийтлэлийн гарчиг</label><input id="article-title" required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} />
    <ImageUpload label="Нийтлэлийн нүүр зураг" tournamentId={tournamentId} value={cover} onChange={setCover} onBusy={setUploading} />
    <label htmlFor="article-body">Нийтлэлийн агуулга</label><textarea id="article-body" rows={14} maxLength={30000} value={body} onChange={e => setBody(e.target.value)} placeholder="Наадмынхаа түүхийг бичээрэй…" /><small className="tp-muted">Догол мөрүүдийг хоосон мөрөөр салгана. Дэд гарчгийг ##, онцлох эшлэлийг &gt; гэж эхлүүлж болно.</small>
    {images.length < 12 && <ImageUpload label="Нийтлэлд зураг нэмэх" tournamentId={tournamentId} value={null} onChange={url => { if (url) setImages(current => [...current, url].slice(0, 12)); }} onBusy={setUploading} />}
    {images.length > 0 && <div className="festival-image-list">{images.map((url, index) => <div key={url}><span>Зураг {index + 1}</span><button type="button" disabled={uploading} onClick={() => setImages(current => current.filter(item => item !== url))}>Хасах</button></div>)}</div>}
    <label htmlFor="article-status">Нийтлэлийн төлөв</label><select id="article-status" value={status} onChange={e => setStatus(e.target.value as "draft" | "published")}><option value="draft">Ноорог</option><option value="published">Нийтлэх</option></select>
    <p className="tp-muted">Наадам нийтлэгдсэн үед нийтэлсэн нийтлэл public хуудсанд харагдана.</p>
    <div className="tp-actions"><button type="submit" className="button button-dark" disabled={uploading}>{busy ? "Хадгалж байна…" : "Нийтлэл хадгалах"}</button><button type="button" className="button button-outline" onClick={() => setPreview(!preview)}>{preview ? "Урьдчилсан харагдац хаах" : "Урьдчилан харах"}</button>{article && <button type="button" className="text-link" onClick={cancel}>Засахаа болих</button>}</div>
  </fieldset>{error && <Notice error>{error}</Notice>}</form>{preview && <div className="festival-preview"><ArticleView article={{ id: article?.id || "preview", tournament_id: tournamentId, title, body, cover_url: cover, image_urls: images, status, created_at: article?.created_at || new Date().toISOString(), published_at: article?.published_at || null }} /></div>}</div>;
}
