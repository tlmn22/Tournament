import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div>
          <Brand />
          <p>Нэг талбар. Олон боломж. Хамтын ялалт.</p>
        </div>
        <nav aria-label="Хуудасны доод цэс">
          <Link href="/tournaments">Тэмцээнүүд</Link>
          <Link href="/#features">Боломжууд</Link>
          <Link href="/register">Бидэнтэй нэгдэх <ArrowUpRight size={15} /></Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Tournament. Бүх эрх хуулиар хамгаалагдсан.</span>
        <span className="made-for">Спортын төлөө. Хамт олны төлөө. <span aria-hidden="true">↗</span></span>
      </div>
    </footer>
  );
}
