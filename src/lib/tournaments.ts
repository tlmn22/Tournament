import { getSupabase } from "./supabase";

export type Tournament = {
  id: string; owner_id: string; name: string; description: string | null;
  status: string; start_date: string | null; end_date: string | null; created_at: string; cover_url?: string | null;
};
export type TournamentEvent = { id: string; tournament_id: string; name: string; sport: string; format: string; results_note?: string | null };
export type Team = { id: string; tournament_event_id: string; company_id: string | null; name: string; final_place?: number | null; result_points?: number | null; group_name?: string | null; result_details?: Partial<Record<"games" | "wins" | "draws" | "losses" | "mp" | "ede" | "bh_gp", number>> | null };
export type Organization = { id: string; tournament_id: string; name: string; logo_url: string | null };
export type CompanyEventPoints = { tournament_id: string; company_id: string; tournament_event_id: string; points: number };
export type Article = { id: string; tournament_id: string; title: string; body: string; cover_url: string | null; image_urls: string[]; status: "draft" | "published"; published_at: string | null; created_at: string };
export type Fixture = {
  id: string; tournament_event_id: string; home_team_id: string; away_team_id: string;
  starts_at: string | null; venue: string; round: string;
  status: "scheduled" | "live" | "completed"; home_score: number | null; away_score: number | null;
};
export type TournamentData = { tournament: Tournament; events: TournamentEvent[]; teams: Team[]; organizations: Organization[]; companyPoints: CompanyEventPoints[]; companyPointsUnavailable: boolean; articles: Article[]; articlesUnavailable: boolean; fixtures: Fixture[]; fixturesUnavailable: boolean };
export const sports: Record<string, string> = { basketball: "Сагсан бөмбөг", volleyball: "Волейбол", football: "Хөлбөмбөг", chess: "Шатар", checkers: "Даам", darts: "Дартс", esports: "Esports", other: "Бусад спорт" };
export const matchStatuses = { scheduled: "Товлосон", live: "Явагдаж байна", completed: "Дууссан" };
export function isId(id: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }
export function dataError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "42501") return "Энэ үйлдлийг хийх эрхгүй байна. Өөрийн бүртгэлээр дахин нэвтэрнэ үү.";
  if (code === "23503") return "Энэ мэдээлэл тоглолт эсвэл багтай холбоотой байна. Холбоотой мэдээллийг эхлээд шалгана уу.";
  if (code === "23505") return "Ижил мэдээлэл аль хэдийн бүртгэгдсэн байна.";
  if (code === "23514" || code === "22P02") return "Оруулсан мэдээлэл тохирохгүй байна. Огноо, баг болон оноогоо шалгана уу.";
  if (code === "PGRST205" || code === "42P01") return "Энэ хэсэг хараахан бэлэн болоогүй байна. Түр хүлээгээд дахин оролдоорой.";
  return error instanceof Error && error.message.startsWith("UI:") ? error.message.slice(3) : "Мэдээлэл хадгалах эсвэл ачаалахад алдаа гарлаа. Дахин оролдоорой.";
}
function localParts(value: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value)).map(p => [p.type, p.value]));
}
export function dateLabel(value: string | null) {
  if (!value) return "Огноо зарлагдаагүй";
  const p = localParts(value);
  return p.year + "." + p.month + "." + p.day;
}
export async function loadTournament(id: string, ownerId?: string): Promise<TournamentData | null> {
  if (!isId(id)) return null;
  const db = getSupabase();
  let query = db.from("tournaments").select("*").eq("id", id);
  query = ownerId ? query.eq("owner_id", ownerId) : query.eq("status", "published");
  const { data: tournament, error } = await query.maybeSingle();
  if (error) throw error;
  if (!tournament) return null;
  let articleQuery = db.from("tournament_articles").select("*").eq("tournament_id", id).order("created_at", { ascending: false });
  if (!ownerId) articleQuery = articleQuery.eq("status", "published");
  const [eventsResult, orgResult, articleResult, pointsResult] = await Promise.all([
    db.from("tournament_events").select("*").eq("tournament_id", id).order("created_at"),
    db.from("companies").select("*").eq("tournament_id", id).order("created_at"),
    articleQuery,
    loadCompanyEventPoints(id),
  ]);
  if (orgResult.error) throw orgResult.error;
  let articlesUnavailable = false;
  if (articleResult.error) {
    if (["PGRST205","42P01"].includes(articleResult.error.code)) articlesUnavailable = true;
    else throw articleResult.error;
  }
  if (eventsResult.error) throw eventsResult.error;
  const events = eventsResult.data as TournamentEvent[];
  const ids = events.map(e => e.id);
  let teams: Team[] = [], fixtures: Fixture[] = [], fixturesUnavailable = false;
  if (ids.length) {
    const [teamResult, fixtureResult] = await Promise.all([
      db.from("teams").select("*").in("tournament_event_id", ids).order("created_at"),
      db.from("tournament_fixtures").select("*").in("tournament_event_id", ids).order("created_at").order("id"),
    ]);
    if (teamResult.error) throw teamResult.error;
    if (fixtureResult.error) {
      if (["PGRST205", "42P01"].includes(fixtureResult.error.code)) fixturesUnavailable = true;
      else throw fixtureResult.error;
    }
    teams = teamResult.data as Team[];
    fixtures = fixtureResult.data as Fixture[] || [];
  }
  return { tournament, events, teams, fixtures, fixturesUnavailable, companyPoints: pointsResult.points, companyPointsUnavailable: pointsResult.unavailable, organizations: orgResult.data as Organization[], articles: (articleResult.data || []) as Article[], articlesUnavailable };
}

async function loadCompanyEventPoints(tournamentId: string): Promise<{ points: CompanyEventPoints[]; unavailable: boolean }> {
  const points: CompanyEventPoints[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await getSupabase().from("company_event_points")
      .select("tournament_id,company_id,tournament_event_id,points")
      .eq("tournament_id", tournamentId).order("company_id").order("tournament_event_id").range(offset, offset + 999);
    if (error) {
      if (["PGRST205", "42P01"].includes(error.code)) return { points: [], unavailable: true };
      throw error;
    }
    points.push(...data as CompanyEventPoints[]);
    if (data.length < 1000) return { points, unavailable: false };
  }
}
