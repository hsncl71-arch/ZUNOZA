import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireAdmin } from "@/lib/zunoza/owner";
import { deleteStoredMedia, isR2ObjectRef } from "@/lib/zunoza/r2";
import {
  DEFAULT_DISCOVER,
  DEFAULT_SHOWCASE,
  isDiscoverStudioPath,
  isShowcaseBadge,
  isShowcaseLane,
  moveClipOrder,
  parseShowcaseRow,
  publicShowcaseCard,
  showcasePosterAllowed,
  showcasePreviewAllowed,
  type ShowcaseBadge,
  type ShowcaseClip,
  type ShowcaseLane,
} from "@/lib/zunoza/showcase";
import { clampXaiAspect } from "@/lib/zunoza/video-request";
import { clampStudioDuration } from "@/lib/zunoza/studio-handoff";

export async function ensureShowcaseColumns(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(
    "alter table showcase_clips add column if not exists lane text not null default 'ilham'",
  );
  await sql.query("alter table showcase_clips add column if not exists tag text not null default ''");
  await sql.query(
    "alter table showcase_clips add column if not exists studio_path text not null default '/olustur'",
  );
  await sql.query("alter table showcase_clips add column if not exists prompt text not null default ''");
  await sql.query(
    "create index if not exists showcase_clips_lane_idx on showcase_clips (lane, active, sort_order, id)",
  );
  await sql.query(
    "create table if not exists showcase_lane_seed (lane text primary key, seeded_at timestamptz not null default now())",
  );
}

async function markLaneSeeded(sql: Awaited<ReturnType<typeof getSql>>, lane: ShowcaseLane) {
  await sql`
    insert into showcase_lane_seed (lane) values (${lane})
    on conflict (lane) do nothing
  `;
}

async function seedLaneIfEmpty(
  sql: Awaited<ReturnType<typeof getSql>>,
  lane: ShowcaseLane,
  clips: ShowcaseClip[],
) {
  const [seeded] = await sql<{ lane: string }>`
    select lane from showcase_lane_seed where lane = ${lane}
  `;
  if (seeded) return;
  const [count] = await sql<{ n: number }>`
    select count(*)::int as n from showcase_clips where lane = ${lane}
  `;
  if ((count?.n ?? 0) > 0) {
    await markLaneSeeded(sql, lane);
    return;
  }
  for (const clip of clips) {
    await sql`
      insert into showcase_clips (
        id, title, category, badge, sort_order, active, preview_url, poster_url,
        subject, scene, negative_prompt, style, camera, lighting, motion,
        duration_seconds, aspect, quality, model, seed, voice_mode,
        lane, tag, studio_path, prompt
      ) values (
        ${clip.id}, ${clip.title}, ${clip.category}, ${clip.badge}, ${clip.sortOrder}, ${clip.active},
        ${clip.previewUrl}, ${clip.posterUrl}, ${clip.subject}, ${clip.scene}, ${clip.negativePrompt},
        ${clip.style}, ${clip.camera}, ${clip.lighting}, ${clip.motion}, ${clip.durationSeconds},
        ${clip.aspect}, ${clip.quality}, ${clip.model}, ${clip.seed}, ${clip.voiceMode},
        ${clip.lane}, ${clip.tag}, ${clip.studioPath}, ${clip.prompt}
      )
      on conflict (id) do nothing
    `;
  }
  await markLaneSeeded(sql, lane);
}

async function seedIfEmpty(sql: Awaited<ReturnType<typeof getSql>>) {
  await ensureShowcaseColumns(sql);
  await seedLaneIfEmpty(sql, "ilham", DEFAULT_SHOWCASE);
  await seedLaneIfEmpty(sql, "kesfet", DEFAULT_DISCOVER);
}

function rowToClip(row: Record<string, unknown>): ShowcaseClip {
  return parseShowcaseRow(row);
}

async function listLane(lane: ShowcaseLane) {
  const sql = await getSql();
  try {
    await seedIfEmpty(sql);
    const rows = await sql<Record<string, unknown>>`
      select * from showcase_clips
      where active = true and lane = ${lane}
      order by sort_order asc, id asc
    `;
    return (rows ?? []).map((row) => publicShowcaseCard(rowToClip(row)));
  } catch {
    const rows = await sql<Record<string, unknown>>`
      select * from showcase_clips
      where active = true
      order by sort_order asc, id asc
    `.catch(() => [] as Record<string, unknown>[]);
    return (rows ?? [])
      .map((row) => publicShowcaseCard(rowToClip(row)))
      .filter((clip) => clip.lane === lane);
  }
}

export const listShowcaseClips = createServerFn({ method: "GET" }).handler(async () => {
  return listLane("ilham");
});

export const listDiscoverClips = createServerFn({ method: "GET" }).handler(async () => {
  return listLane("kesfet");
});

export const listAdminShowcase = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    await seedIfEmpty(sql);
    const rows = await sql<Record<string, unknown>>`
      select * from showcase_clips order by lane asc, sort_order asc, id asc
    `;
    return (rows ?? []).map((row) => rowToClip(row));
  });

type ShowcaseInput = Partial<ShowcaseClip> & { id?: string };

function qualityOf(value: unknown): ShowcaseClip["quality"] {
  const raw = String(value ?? "hd");
  if (raw === "ekonomik" || raw === "standart" || raw === "ultra") return raw;
  return "hd";
}

function badgeOf(value: unknown): ShowcaseBadge {
  const raw = String(value ?? "");
  return isShowcaseBadge(raw) ? raw : "";
}

function laneOf(value: unknown): ShowcaseLane {
  const raw = String(value ?? "ilham");
  return isShowcaseLane(raw) ? raw : "ilham";
}

function studioOf(value: unknown) {
  const raw = String(value ?? "/olustur").trim()
... 