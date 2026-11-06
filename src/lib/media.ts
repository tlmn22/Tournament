import { getSupabase } from "./supabase";

export const MEDIA_BUCKET = "tournament-media";
export function safeImageUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}
export async function uploadImage(file: File, tournamentId: string) {
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error("UI:PNG, JPG эсвэл WebP зураг сонгоно уу. Хэмжээ 5 MB-аас бага байна.");
  const path = tournamentId + "/" + crypto.randomUUID() + "." + extension;
  const storage = getSupabase().storage.from(MEDIA_BUCKET);
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("UI:Зураг хуулахад алдаа гарлаа. Холболтоо шалгаад дахин оролдоорой.");
  return storage.getPublicUrl(path).data.publicUrl;
}
