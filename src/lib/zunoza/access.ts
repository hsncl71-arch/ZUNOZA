import { getSql } from "@/lib/db";
import { isUnlimitedUser } from "@/lib/zunoza/owner";

export type StudioId = "video" | "gorsel" | "muzik" | "tts" | "klip" | "montaj";

async function countSince(
  sql: Awaited<ReturnType<typeof getSql>>,
  table: string,
  userId: string,
) {
  const rows = await sql.query<{ n: number }>(
    `select count(*)::int as n from ${table} where user_id = $1 and created_at >= current_date`,
    [userId],
  );
  return rows[0]?.n ?? 0;
}

async function countUserToday(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const video = await countSince(sql, "video_jobs", userId);
  const image = await countSince(sql, "image_assets", userId);
  const music = await countSince(sql, "music_assets", userId);
  const tts = await countSince(sql, "voice_assets", userId);
  return video + image + music + tts;
}

async function countStudioToday(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  studio: StudioId,
) {
  if (studio === "video") {
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from video_jobs
      where user_id = ${userId} and storyboard_id is null and created_at >= current_date
    `;
    return rows[0]?.n ?? 0;
  }
  if (studio === "klip") {
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from video_jobs
      where user_id = ${userId} and storyboard_id is not null and created_at >= current_date
    `;
    return rows[0]?.n ?? 0;
  }
  if (studio === "gorsel") return countSince(sql, "image_assets", userId);
  if (studio === "muzik") return countSince(sql, "music_assets", userId);
  if (studio === "tts") return countSince(sql, "voice_assets", userId);
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from montage_projects
    where user_id = ${userId} and created_at >= current_date
  `;
  return rows[0]?.n ?? 0;
}

export async function assertCanUseStudio(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  studio: StudioId,
) {
  if (await isUnlimitedUser(sql, userId)) return;
  const [profile] = await sql<{ is_active: boolean; blocked: boolean; daily_limit: number | null }>`
    select is_active, blocked, daily_limit from zunoza_profiles where user_id = ${userId}
  `;
  if (profile?.blocked) throw new Error("Hesabınız durduruldu. Destek ile iletişime geçin.");
  if (profile && profile.is_active === false) throw new Error("Hesabınız pasif durumda.");
  const [setting] = await sql<{ enabled: boolean; daily_limit: number | null }>`
    select enabled, daily_limit from studio_settings where studio_id = ${studio}
  `;
  if (setting && setting.enabled === false) {
    throw new Error("Bu stüdyo şu an kullanıma kapalı.");
  }
  if (profile?.daily_limit != null) {
    const used = await countUserToday(sql, userId);
    if (used >= profile.daily_limit) throw new Error("Günlük kullanım limitinize ulaştınız.");
  }
  if (setting?.daily_limit != null) {
    const used = await countStudioToday(sql, userId, studio);
    if (used >= setting.daily_limit) throw new Error("Bu stüdyo için günlük limit doldu.");
  }
}
