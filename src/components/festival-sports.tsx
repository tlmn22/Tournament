"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Pencil, Trophy } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { sports, dataError, type TournamentData, type TournamentEvent } from "@/lib/tournaments";
import { Notice } from "./tournament-ui";

export function SportsManager({ data, reload, open }: { data: TournamentData; reload: () => void; open: (id: string) => void }) {
  const [editing, setEditing] = useState<TournamentEvent | null>(null);
  return <div className="admin-management-grid"><SportForm key={editing?.id || "new"} data={data} editing={editing} saved={() => { setEditing(null); reload(); }} cancel={() => setEditing(null)} /><div className="tp-stack">
    {data.events.map(event => <section className="tp-panel festival-sport-card" key={event.id}><Trophy size={25} /><div><h2>{event.name}</h2><p className="tp-muted">{data.teams.filter(t => t.tournament_event_id === event.id).length} баг · {data.fixtures.filter(m => m.tournament_event_id === event.id).length} тоглолт</p></div><button className="tp-icon-button" type="button" onClick={() => setEditing(event)} aria-label={event.name + " спорт засах"}><Pencil size={16} /></button><button className="button button-lime" type="button" onClick={() => open(event.id)}>Баг, тоглолт удирдах <ArrowUpRight size={16} /></button></section>)}
    {!data.events.length && <Notice>Сагс · Эрэгтэй, Сагс · Эмэгтэй, Волейбол зэрэг тэмцээнүүдээ тус тусад нь нэмээрэй.</Notice>}
  </div></div>;
}
function SportForm({ data, editing, saved, cancel }: { data: TournamentData; editing: TournamentEvent | null; saved: () => void; cancel: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = e.currentTarget, values = new FormData(form);
    const sport = String(values.get("sport")), gender = String(values.get("gender"));
    const name = String(values.get("name") || "").trim() || sports[sport] + " · " + gender;
    setBusy(true); setError("");
    try {
      const query = editing ? getSupabase().from("tournament_events").update({ name, sport }).eq("id", editing.id) : getSupabase().from("tournament_events").insert({ tournament_id: data.tournament.id, name, sport, format: "other" });
      const { error } = await query.select("id").single(); if (error) throw error;
      form.reset(); saved();
    } catch (error) { setError(dataError(error)); } finally { setBusy(false); }
  }
  return <form className="tp-panel tp-form" onSubmit={submit}><h2>{editing ? "Спортын тэмцээн засах" : "Спортын тэмцээн нэмэх"}</h2><fieldset disabled={busy}>
    <label htmlFor="sport-type">Спортын төрөл</label><select id="sport-type" name="sport" defaultValue={editing?.sport || "basketball"}>{Object.entries(sports).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
    {!editing && <><label htmlFor="sport-gender">Ангилал</label><select id="sport-gender" name="gender"><option>Эрэгтэй</option><option>Эмэгтэй</option><option>Холимог</option><option>Нээлттэй</option></select></>}
    <label htmlFor="sport-title">Тэмцээний нэр {editing ? "" : "(заавал биш)"}</label><input id="sport-title" name="name" required={!!editing} maxLength={160} defaultValue={editing?.name} placeholder="Хоосон бол спорт, ангиллаар нэрлэнэ" />
    <button type="submit" className="button button-dark">{busy ? "Хадгалж байна…" : "Спорт хадгалах"}</button>{editing && <button type="button" className="text-link" onClick={cancel}>Засахаа болих</button>}
  </fieldset>{error && <Notice error>{error}</Notice>}</form>;
}
