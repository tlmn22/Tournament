"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { useAuth } from "./auth-provider";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <a className="skip-link" href="#main-content">Үндсэн агуулга руу очих</a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Үндсэн цэс">
            <Link className={(pathname === "/" || pathname.startsWith("/tournaments")) ? "active" : ""} href="/tournaments">Тэмцээнүүд</Link>
          </nav>
          <div className="header-actions">
            <Link className="login-link" href={user ? "/admin" : "/login"}>{loading ? "Түр хүлээнэ үү…" : user ? "Удирдлага" : "Нэвтрэх"}</Link>
            {!loading && !user && <Link className="button button-dark button-small" href="/register">Бүртгүүлэх <ArrowUpRight size={16} /></Link>}
          </div>
          <button ref={toggleRef} className="menu-toggle" type="button" aria-label={open ? "Цэс хаах" : "Цэс нээх"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
            {open ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {open && (
          <nav id="mobile-navigation" className="mobile-nav" aria-label="Гар утасны цэс" onClick={() => setOpen(false)}>
            <Link href="/tournaments">Тэмцээнүүд</Link>
            <Link href={user ? "/admin" : "/login"}>{user ? "Удирдлага" : "Нэвтрэх"}</Link>
            {!loading && !user && <Link className="mobile-signup" href="/register">Бүртгүүлэх <ArrowUpRight size={17} /></Link>}
          </nav>
        )}
      </header>
    </>
  );
}
