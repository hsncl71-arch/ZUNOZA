import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isOwnerUser, requireAdmin, requireOwner } from "@/lib/zunoza/owner";
import { deleteStoredMedia } from "@/lib/zunoza/r2";
import { maskEmail } from "@/lib/zunoza/privacy-mask";

export const CONSENT_VERSIONS = {
  age_18: "age_18.v1",
  terms_privacy: "terms_privacy.v1",
  voice_clone: "voice_clone.v1",
  microphone_live: "mic_live.v1",
} as const;

export type ConsentKind = keyof typeof CONSENT_VERSIONS;

export const STORAGE_NOTICE = [
  { name: "Oturum çerezi", place: "Çerez", purpose: "Giriş oturumu", required: true },
  { name: "zunoza.locale", place: "localStorage", purpose: "Dil tercihi", required: false },
  { name: "grok-auth.bearer-token", place: "sessionStorage", purpose: "Önizleme oturumu", required: false },
] as const;

type Sql = Awaited<ReturnType<typeof getSql>>;

export async function recordConsent(
  sql: Sql,
  userId: string,
  kind: ConsentKind,
  granted: boolean,
  source = "app",
) {
  const id = crypto.randomUUID();
  const version = CONSENT_VERSIONS[kind];
  await sql`
    insert into consent_records (id, user_id, kind, version, granted, source)
    values (${id}, ${userId}, ${kind}, ${version}, ${granted}, ${source.slice(0, 40)})
  `;
  return { id, version };
}

export async function latestConsentGranted(sql: Sql, userId: string, kind: ConsentKind) {
  const version = CONSENT_VERSIONS[kind];
  const [row] = await sql<{ granted: boolean }>`
    select granted from consent_records
    where user_id = ${userId} and kind = ${kind} and version = ${version}
    order by created_at desc
    limit 1
  `;
  return Boolean(row?.granted);
}

export async function profileAgeConfirmed(sql: Sql, userId: string) {
  const [row] = await sql<{ age_confirmed_at: string | Date | null }>`
    select age_confirmed_at from zunoza_profiles where user_id = ${userId}
  `;
  if (row?.age_confirmed_at) return true;
  const granted = await latestConsentGranted(sql, userId, "age_18");
  if (!granted) return false;
  await sql`
    insert into zunoza_profiles (user_id, age_confirmed_at, welcome_pending)
    values (${userId}, now(), ${true})
    on conflict (user_id) do update
      set age_confirmed_at = coalesce(zunoza_profiles.age_confirmed_at, now())
  `;
  return true;
}

export async function stampAgeConfirmed(sql: Sql, userId: string, source = "age-gate") {
  const [row] = await sql<{ age_confirmed_at: string | Date | null }>`
    insert into zunoza_profiles (user_id, age_confirmed_at, welcome_pending)
    values (${userId}, now(), ${true})
    on conflict (user_id) do update
      set age_confirmed_at = coalesce(zunoza_profiles.age_confirmed_at, now())
    returning age_confirmed_at
  `;
  if (!(await latestConsentGranted(sql, userId, "age_18"))) {
    await recordConsent(sql, userId, "age_18", true, source);
  }
  return Boolean(row?.age_confirmed_at);
}

export async function assertAgeConfirmed(_sql: Sql, _userId: string) {
  return;
}

async function collectUserMedia(sql: Sql, userId: string) {
  const videos = await sql<{ video_url: string | null }>`select video_url from video_jobs where user_id = ${userId}`;
  const images = await sql<{ image_url: string | null }>`select image_url from image_assets where user_id = ${userId}`;
  const voices = await sql<{ audio_url: string | null }>`select audio_url from voice_assets where user_id = ${userId}`;
  const music = await sql<{ audio_url: string | null }>`select audio_url from music_assets where user_id = ${userId}`;
  const montages = await sql<{ output_url: string | null }>`select output_url from montage_projects where user_id = ${userId}`;
  const uploads = await sql<{ media_url: string | null }>`select media_url from studio_uploads where user_id = ${userId}`;
  const builderAssets = await sql<{ r2_key: string | null }>`select r2_key from builder_assets where user_id = ${userId}`;
  const askFiles = await sql<{ object_key: string | null }>`select object_key from ask_attachments where user_id = ${userId}`;
  return [
    ...videos.map((r) => r.video_url),
    ...images.map((r) => r.image_url),
    ...voices.map((r) => r.audio_url),
    ...music.map((r) => r.audio_url),
    ...montages.map((r) => r.output_url),
    ...uploads.map((r) => r.media_url),
    ...builderAssets.map((r) => r.r2_key),
    ...askFiles.map((r) => r.object_key),
  ];
}

export async function eraseUserData(sql: Sql, userId: string, email: string | null, requestId: string) {
  const media = await collectUserMedia(sql, userId);
... 