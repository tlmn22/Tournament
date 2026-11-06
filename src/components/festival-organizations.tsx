"use client";
import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { dataError, type Organization, type TournamentData } from "@/lib/tournaments";
import { ImageUpload, TeamLogo } from "./festival-media";
import { Notice } from "./tournament-ui";

export function OrganizationsManager({ data, reload, next }: { data: TournamentData; reload: () => void; next: () => void }) {
  const [editing, setEditing] = useState<Organization | null>(null);
  return <div className="admin-management-grid"><OrganizationForm key={editing?.id || "new"} tournamentId={data.tournament.id} organization={editing} onSaved={() => { setEditing(null); reload(); }} cancel={() => setEditing(null)} />
    <section className="tp-panel"><div className="tp-panel-heading"><h2>Оролцогч багууд · {data.organizations.length}</h2><p>УУГ, Оффис эсвэл группийн компаниудыг энд нэг удаа бүртгэнэ.</p></div>
      {data.organizations.map(org => <div className="admin-team-row" key={org.id}><TeamLogo name={org.name} url={org.logo_url} /><div><strong>{org.name}</strong><small>{data.teams.filter(t => t.company_id === org.id).length} спортын баг</small></div><button type="button" className="tp-icon-button" onClick={() => setEditing(org)} aria-label={org.name + " оролцогч засах"}><Pencil size={16} /></button></div>)}
      {!data.organizations.length && <p className="tp-muted">Оролцогч багуудаа нэр, логотой нь нэмээрэй.</p>}
      {data.organizations.length > 0 && <button className="button button-lime admin-next" onClick={next}>Дараагийн алхам: Спортын тэмцээнүүд</button>}
    </section></div>;
}
function OrganizationForm({ tournamentId, organization, onSaved, cancel }: { tournamentId: string; organization: Organization | null; onSaved: () => void; cancel: () => void }) {
  const [logo, setLogo] = useState<string | null>(organization?.logo_url || null);
  const [uploading, setUploading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || uploading) return;
    const form = e.currentTarget, name = String(new FormData(form).get("name") || "").trim();
    if (!name) { setError("Багийн нэрээ оруулна уу."); return; }
    setBusy(true); setError("");
    try {
      const values = { name, logo_url: logo };
      const query = organization ? getSupabase().from("companies").update(values).eq("id", organization.id) : getSupabase().from("companies").insert({ ...values, tournament_id: tournamentId });
      const { error } = await query.select("id").single(); if (error) throw error;
      form.reset(); setLogo(null); onSaved();
    } catch (error) { setError(dataError(error)); } finally { setBusy(false); }
  }
  return <form className="tp-panel tp-form" onSubmit={save}><h2>{organization ? "Оролцогч баг засах" : "Оролцогч баг нэмэх"}</h2><fieldset disabled={busy}><label htmlFor="org-name">Байгууллага / нэгжийн нэр</label><input id="org-name" name="name" required maxLength={160} defaultValue={organization?.name} placeholder="Жишээ: УУГ, Оффис…" /><ImageUpload tournamentId={tournamentId} value={logo} onChange={setLogo} onBusy={setUploading} label="Багийн лого" /><button className="button button-dark" type="submit" disabled={uploading}>{busy ? "Хадгалж байна…" : "Оролцогч хадгалах"}</button>{organization && <button className="text-link" type="button" onClick={cancel}>Засахаа болих</button>}</fieldset>{error && <Notice error>{error}</Notice>}</form>;
}
