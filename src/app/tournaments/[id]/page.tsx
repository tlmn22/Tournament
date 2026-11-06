import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicTournament } from "@/components/public-tournaments";
export const metadata: Metadata = { title: "Тэмцээний талбар" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><SiteHeader /><main id="main-content" className="tp-public container"><PublicTournament id={id} /></main><SiteFooter /></>; }
