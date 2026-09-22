import { Gamepad2, Trophy } from "lucide-react";

export type Sport = "basketball" | "volleyball" | "football" | "esports" | "other";

export function SportIcon({ sport, size = 24 }: { sport: Sport; size?: number }) {
  if (sport === "esports") return <Gamepad2 size={size} strokeWidth={1.65} aria-hidden="true" />;
  if (sport === "other") return <Trophy size={size} strokeWidth={1.65} aria-hidden="true" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {sport === "basketball" && <><path d="M3 12h18M12 3v18M5.6 5.6c7 3 7 9.8 0 12.8M18.4 5.6c-7 3-7 9.8 0 12.8" /></>}
      {sport === "volleyball" && <><path d="M12 3c-4 4-4 9 0 12M20.5 9c-5-2-9 0-11 4M9 20.5c4-3 6-7 4-11M3.2 10c1 4 4 6 8.8 5M16 4c-2 2-3 4-3 5M19 18c-3 .5-5-.5-7-3" /></>}
      {sport === "football" && <><path d="m12 7 5 3-2 5H9l-2-5zM12 3v4M3.5 9.5 7 10M17 10l3.5-.5M15 15l2.5 4M9 15l-2.5 4" /></>}
    </svg>
  );
}
