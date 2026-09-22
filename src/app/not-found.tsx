import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return <><SiteHeader /><main id="main-content" className="not-found"><h1>404</h1><h2>Энэ талбай одоогоор хоосон байна.</h2><p>Хуудасны хаягаа шалгах эсвэл нүүр хуудас руу буцаарай.</p><Link href="/" className="button button-lime"><ArrowLeft size={17} /> Нүүр хуудас руу</Link></main><SiteFooter /></>;
}
