"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./auth-provider";
import { dataError, type Tournament } from "@/lib/tournaments";
import { Notice } from "./tournament-ui";
import { ImageUpload } from "./festival-media";

export function TournamentEditor({ tournament, onSaved }: { tournament?: Tournament; onSaved?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const [cover, setCover] = useState<string | null>(tournament?.cover_url || null), [uploading, setUploading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const start = String(data.get("start_date") || "");
    const end = String(data.get("end_date") || "");
    setError(""); setSaved(false);
    if (!name) { setError("Наадмын нэрээ оруулна уу."); return; }
    if (end && start && end < start) { setError("Дуусах огноо эхлэх огнооноос өмнө байж болохгүй."); return; }
    setBusy(true);
    try {
      const values = { name, description: String(data.get("description") || "").trim(), start_date: start || null, end_date: end || null, ...(tournament && cover !== (tournament.cover_url || null) ? { cover_url: cover } : {}) };
      const existingId = tournament?.id;
      const query = existingId
        ? getSupabase().from("tournaments").update(values).eq("id", existingId).eq("owner_id", user.id)
        : getSupabase().from("tournaments").insert({ ...values, owner_id: user.id, status: "draft" });
      const { data: row, error } = await query.select("id").single();
      if (error) throw error;
      if (tournament) { setSaved(true); onSaved?.(); } else router.push("/admin/tournaments/" + row.id);
    } catch (error) { setError(dataError(error)); }
    finally { setBusy(false); }
  }
  return <form className="tp-panel tp-form" onSubmit={submit}>
    <div className="tp-panel-heading"><h2>Үндсэн мэдээлэл</h2><p>Нэр, тайлбар, хугацаа нь нийтэд харагдана.</p></div>
    <fieldset disabled={busy || uploading}><label htmlFor="tournament-name">Наадмын нэр <span>*</span></label><input id="tournament-name" name="name" required maxLength={160} defaultValue={tournament?.name} placeholder="Жишээ: Хамт олны спортын наадам" />
    <label htmlFor="tournament-description">Танилцуулга</label><textarea id="tournament-description" name="description" maxLength={5000} rows={5} defaultValue={tournament?.description || ""} placeholder="Тэмцээний зорилго, оролцох нөхцөл болон хэрэгтэй мэдээлэл…" />
    <div className="tp-form-columns"><div><label htmlFor="start-date">Эхлэх огноо</label><input id="start-date" type="date" name="start_date" defaultValue={tournament?.start_date || ""} /></div><div><label htmlFor="end-date">Дуусах огноо</label><input id="end-date" type="date" name="end_date" defaultValue={tournament?.end_date || ""} /></div></div>
    {tournament && <><ImageUpload label="Cover зураг" tournamentId={tournament.id} value={cover} onChange={setCover} onBusy={setUploading} /><small className="tp-muted">3:1 харьцаатай, 2400×800 px зураг тохиромжтой. Зураг дээр текст бичихгүй; нэр, огноо доор нь харагдана.</small></>}
    <button type="submit" className="button button-dark" disabled={uploading}><Save size={17} />{busy ? "Хадгалж байна…" : tournament ? "Өөрчлөлт хадгалах" : "Наадам үүсгээд оролцогч нэмэх"}</button></fieldset>
    {error && <Notice error>{error}</Notice>}{saved && <Notice>Мэдээлэл хадгалагдлаа.</Notice>}
  </form>;
}
