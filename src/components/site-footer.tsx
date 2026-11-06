import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer site-footer-minimal">
    <div className="container footer-bottom">
      <span>© {new Date().getFullYear()} temtseen.app</span>
      <Link href="/tournaments">Бүх тэмцээн</Link>
    </div>
  </footer>;
}