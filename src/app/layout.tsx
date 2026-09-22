import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "../styles/responsive.css";

export const metadata: Metadata = {
  title: {
    default: "Tournament — Тэмцээн бүрийг хамтдаа бүтээе",
    template: "%s | Tournament",
  },
  description:
    "Байгууллагын спортын наадам, жижиг лиг, esports тэмцээний баг, хуваарь, тоглолт, үр дүнг нэг дор зохион байгуулах талбар.",
  applicationName: "Tournament",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
