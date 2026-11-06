import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicTournaments } from "@/components/public-tournaments";
export const metadata: Metadata = { title: "Тэмцээнүүд" };
export default function Page() { return <><SiteHeader /><main id="main-content" className="tp-public container"><PublicTournaments /></main><SiteFooter /></>; }
