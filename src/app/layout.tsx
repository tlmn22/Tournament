import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "@fontsource-variable/manrope";
import "./globals.css";
import "../styles/responsive.css";
import "../styles/tournaments.css";
import "../styles/theme-neon.css";

export const metadata: Metadata = {
  title: {
    default: "temtseen.app — Тэмцээн бүрийг хамтдаа бүтээе",
    template: "%s | temtseen.app",
  },
  description:
    "Байгууллагын спортын наадам, жижиг лиг, esports тэмцээний баг, хуваарь, тоглолт, үр дүнг нэг дор зохион байгуулах талбар.",
  applicationName: "temtseen.app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
