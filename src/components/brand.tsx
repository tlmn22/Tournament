import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand${light ? " brand-light" : ""}`} aria-label="Tournament — Нүүр хуудас">
      <svg className="brand-symbol" width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="currentColor" />
        <path d="M11 10h23l-4 7h-8L14 31H6l8-14H7z" fill="#c5f36b" />
      </svg>
      <span>Tournament<span className="brand-dot">.</span></span>
    </Link>
  );
}
