import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { musicProviderReady } from "@/lib/zunoza/music";
import { shotstackReady } from "@/lib/zunoza/montage";
import { r2ClientAudioUrl, r2ClientImageUrl, r2ClientMusicUrl, r2ClientVideoUrl } from "@/lib/zunoza/r2";

export type HubItem = {
  id: string;
  kind: "video" | "image" | "voice" | "music" | "storyboard" | "montage";
  title: string;
  status: string | null;
  url: string | null;
  createdAt: string;
};

export type StudioStats = {
  videos: number;
  completedVideos: number;
  images: number;
  voices: number;
  music: number;
  storyboards: number;
  montages: number;
  creditsUsed: number;
  creditsGranted: number;
  balance: number;
  musicReady: boolean;
  renderReady: boolean;
};

export const getStudioHub = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const uid = context.userId;
    const [videos, images, voices, montages, musicRows, countRows, walletRows, ledgerRows] = await Promise.all([
      sql<Record<string, unknown>>`
        select id, prompt, status, video_url, created_at from video_jobs
        where user_id = ${uid} order by created_at desc limit 12
      `,
      sql<Record<string, unknown>>`
        select id, prompt, image_url, created_at from image_assets
        where user_id = ${uid} order by created_at desc limit 8
      `,
      sql<Record<string, unknown>>`
        select id, text, audio_url, created_at from voice_assets
        where user_id = ${uid} order by created_at desc limit 8
      `,
      sql<Record<string, unknown>>`
        select id, title, status, created_at from montage_projects
        where user_id = ${uid} order by updated_at desc limit 8
      `,
      sql<Record<string, unknown>>`
        select id, prompt, audio_url, created_at from music_assets
        where user_id = ${uid} order by created_at desc limit 8
      `,
      sql<{
        videos: number;
        completed: number;
        images: number;
        voices: number;
        music: number;
        storyboards: number;
        montages: number;
      }>`
        select
          (select count(*)::int from video_jobs where user_id = ${uid}) as videos,
          (select count(*)::int from video_jobs where user_id = ${uid} and status = 'tamamlandi') as completed,
          (select count(*)::int from image_assets where user_id = ${uid}) as images,
          (select count(*)::int from voice_assets where user_id = ${uid}) as voices,
          (select count(*)::int from music_assets where user_id = ${uid}) as music,
          (select count(*)::int from storyboard_projects where user_id = ${uid}) as storyboards,
          (select count(*)::int from montage_projects where user_id = ${uid}) as montages
      `,
      sql<{ balance: number }>`
        select balance from credit_wallets where user_id = ${uid}
      `,
      sql<{ used: number; granted: number }>`
        select
          coalesce(sum(case when amount < 0 then -amount else 0 end), 0)::int as used,
          coalesce(sum(case when amount > 0 then amount else 0 end), 0)::int as granted
        from credit_ledger where user_id = ${uid}
      `,
    ]);
    const counts = countRows[0];
    const wallet = walletRows[0];
    const ledger = ledgerRows[0];

    const feed: HubItem[] = [
      ...videos.map((r) => ({
        id: String(r.id),
        kind: "video" as const,
        title: String(r.prompt ?? "Video").slice(0, 80),
        status: r.status ? String(r.status) : null,
        url: r2ClientVideoUrl(String(r.id), r.video_url ? String(r.video_url) : null),
        createdAt: String(r.created_at),
      })),
      ...images.map((r) => ({
        id: String(r.id),
        kind: "image" as const,
        title: String(r.prompt ?? "Görsel").slice(0, 80),
        status: "tamamlandi",
        url: r2ClientImageUrl(String(r.id), r.image_url ? String(r.image_url) : null),
        createdAt: String(r.created_at),
      })),
      ...voices.map((r) => ({
        id: String(r.id),
        kind: "voice" as const,
        title: String(r.text ?? "Ses").slice(0, 80),
        status: "tamamlandi",
        url: r2ClientAudioUrl(String(r.id), r.audio_url ? String(r.audio_url) : null),
        createdAt: String(r.created_at),
      })),
      ...montages.map((r)
... 