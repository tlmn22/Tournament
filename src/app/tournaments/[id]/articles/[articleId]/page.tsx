import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicArticle } from "@/components/festival-articles";
export const metadata: Metadata = { title: "Наадмын нийтлэл" };
export default async function Page({ params }: { params: Promise<{ id: string; articleId: string }> }) {
  const { id, articleId } = await params;
  return <><SiteHeader /><main id="main-content" className="tp-public container"><PublicArticle tournamentId={id} articleId={articleId} /></main><SiteFooter /></>;
}
