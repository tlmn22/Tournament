"use client";
/* eslint-disable @next/next/no-img-element -- User-uploaded Supabase images are served directly without an image optimizer. */
import { useState } from "react";
import { uploadImage, safeImageUrl } from "@/lib/media";
import { dataError } from "@/lib/tournaments";

export function TeamLogo({ name, url }: { name: string; url?: string | null }) {
  const source = safeImageUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="festival-logo">{source && failed !== source ? <img src={source} alt="" width={48} height={48} loading="lazy" onError={() => setFailed(source)} /> : <span aria-hidden="true">{name.slice(0, 1)}</span>}</span>;
}
export function ImageUpload({ tournamentId, value, onChange, label, onBusy }: {
  tournamentId: string; value: string | null; onChange: (url: string | null) => void; label: string; onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className="festival-upload">
    <label>{label}<input aria-label={label} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = "";
      if (!file) return;
      setBusy(true); onBusy?.(true); setError("");
      try { onChange(await uploadImage(file, tournamentId)); }
      catch (error) { setError(dataError(error)); }
      finally { setBusy(false); onBusy?.(false); }
    }} /></label>
    <small>PNG, JPG, WebP · 5 MB хүртэл</small>
    {busy && <p role="status">Зураг хуулж байна…</p>}
    {safeImageUrl(value) && <div className="festival-upload-preview"><img src={safeImageUrl(value)!} alt={label + " — урьдчилан харах"} width={160} height={110} /><button type="button" disabled={busy} onClick={() => onChange(null)}>Зургийг авах</button></div>}
    {error && <p role="alert" className="festival-inline-error">{error}</p>}
  </div>;
}
