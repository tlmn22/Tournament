import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TournamentDirectory } from "@/components/tournament-directory";

export const metadata: Metadata = { title: { absolute: "Тэмцээнүүд | temtseen.app" } };

export default function Home() {
  return <><SiteHeader /><main id="main-content" className="tp-public container"><TournamentDirectory /></main><SiteFooter /></>;
}