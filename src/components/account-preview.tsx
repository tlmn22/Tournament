"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Trophy } from "lucide-react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { useAuth } from "./auth-provider";
import { getSupabase } from "@/lib/supabase";

function errorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials": return "Имэйл эсвэл нууц үг буруу байна.";
    case "email_not_confirmed": return "Имэйлдээ ирсэн холбоосоор бүртгэлээ баталгаажуулаарай.";
    case "user_already_exists": return "Энэ имэйл бүртгэлтэй байна. Нэвтрэх хэсгийг ашиглаарай.";
    case "weak_password": return "Нууц үг хангалттай хүчтэй биш байна. Урт, үсэг, тоо, тэмдэгт хослуулсан нууц үг сонгоорой.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Олон хүсэлт илгээсэн байна. Түр хүлээгээд дахин оролдоорой.";
    case "signup_disabled": return "Шинэ бүртгэл түр хаалттай байна.";
    default: return "Хүсэлт амжилтгүй боллоо. Мэдээлэл болон интернэт холболтоо шалгаад дахин оролдоорой.";
  }
}

export function AccountPreview({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const { user, loading, error: authError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const address = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setError("");
    setMessage("");
    if (registering && password !== data.get("confirm")) {
      setError("Нууц үг давтан оруулсан нууц үгтэй таарахгүй байна.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabase();
      const result = registering
        ? await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: window.location.origin + "/login" } })
        : await supabase.auth.signInWithPassword({ email: address, password });
      if (result.error) {
        setError(errorMessage(result.error.code));
        if (result.error.code === "email_not_confirmed") {
          setEmail(address);
          setMessage("Бүртгэлээ баталгаажуулах имэйл ирээгүй бол холбоос дахин аваарай.");
        }
      } else {
        form.reset();
        setEmail(address);
        setMessage(result.data.session ? "" : "Имэйлээ шалгаад баталгаажуулах холбоос дээр дарна уу. Бүртгэлтэй бол нэвтрэх хэсгийг ашиглаарай.");
      }
    } catch {
      setError(errorMessage());
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || !email) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup", email, options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (error) setError(errorMessage(error.code));
      else setMessage("Баталгаажуулах холбоос дахин илгээлээ. Имэйлийн spam хавтсыг мөн шалгаарай.");
    } catch { setError(errorMessage()); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signOut({ scope: "local" });
      if (error) setError(errorMessage(error.code));
      else { setMessage(""); setEmail(""); }
    } catch { setError(errorMessage()); }
    finally { setBusy(false); }
  }

  return <><SiteHeader /><main id="main-content" className="subpage"><div className="container">
    <Link href="/" className="back-link"><ArrowLeft size={16} /> Нүүр хуудас</Link>
    <div className="auth-shell">
      <div className="auth-art"><Trophy size={43} strokeWidth={1.4} /><h2>Нэг талбар.<br />Олон боломж.<br />Хамтын ялалт.</h2><p>Тэмцээн бүрийн ард нэг хамт олон,<br />хамтдаа бүтээх нэг түүх бий.</p><div className="auth-orbit" aria-hidden="true" /></div>
      <div className="auth-content">
        <h1>{user ? "Миний бүртгэл" : registering ? "temtseen.app-д нэгдэх" : "Дахин уулзахад таатай байна"}</h1>
        {loading ? <p role="status">Бүртгэлийн төлөв шалгаж байна…</p> : user ? <>
          <p className="account-email">{user.email}</p>
          <p>Та амжилттай нэвтэрлээ.</p>
          <Link href="/admin" className="button button-lime">Тэмцээнээ удирдах <ArrowUpRight size={17} /></Link>
          <button type="button" className="button button-outline auth-signout" disabled={busy} onClick={signOut}>{busy ? "Түр хүлээнэ үү…" : "Гарах"}</button>
        </> : <>
          <p>{registering ? "Имэйл, нууц үгээр бүртгэлээ үүсгээрэй." : "Бүртгэлтэй имэйл, нууц үгээ оруулаарай."}</p>
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="email">Имэйл</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} />
            <label htmlFor="password">Нууц үг</label>
            <input id="password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} required disabled={busy} aria-describedby={registering ? "password-hint" : undefined} />
            {registering && <><small id="password-hint">Хамгийн багадаа 8 тэмдэгт.</small><label htmlFor="confirm">Нууц үг давтах</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy} /></>}
            <button className="button button-lime" type="submit" disabled={busy}>{busy ? "Түр хүлээнэ үү…" : registering ? "Бүртгүүлэх" : "Нэвтрэх"}<ArrowUpRight size={17} /></button>
          </form>
          {message && <div className="auth-notice"><p role="status">{message}</p><button className="text-link" type="button" onClick={resend} disabled={busy}>Баталгаажуулах холбоос дахин авах</button></div>}
          <p className="auth-switch">{registering ? "Бүртгэлтэй юу? " : "Анх удаа зочилж байна уу? "}<Link href={registering ? "/login" : "/register"}>{registering ? "Нэвтрэх" : "Бүртгүүлэх"}</Link></p>
        </>}
        {(error || authError) && <p className="auth-error" role="alert">{error || authError}</p>}
      </div>
    </div>
  </div></main><SiteFooter /></>;
}
