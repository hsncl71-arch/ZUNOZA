import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { requireAdmin } from "@/lib/zunoza/owner";
import {
  abortR2Multipart,
  completeR2Multipart,
  createR2Multipart,
  deleteR2Object,
  deleteStoredMedia,
  getR2Object,
  isR2ObjectRef,
  putR2Object,
  r2Configured,
  r2ObjectRef,
  showcaseObjectKey,
  uploadR2Part,
} from "@/lib/zunoza/r2";
import { ensureShowcaseColumns } from "@/lib/zunoza/showcase-api";
import {
  DEFAULT_DISCOVER,
  DEFAULT_SHOWCASE,
  isShowcaseLane,
  newShowcaseClipId,
  sniffVideoContainer,
  titleFromVideoFilename,
  type ShowcaseLane,
} from "@/lib/zunoza/showcase";
import { SHOWCASE_CHUNK_BYTES, showcaseVideoSizeError } from "@/lib/zunoza/showcase-upload";

const PART_MAX = SHOWCASE_CHUNK_BYTES + 64 * 1024;
const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/mpeg",
  "video/hevc",
  "application/octet-stream",
  "",
]);

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function mimeFor(ext: "mp4" | "mov") {
  return ext === "mov" ? "video/quicktime" : "video/mp4";
}

function extOf(name: string, mime: string) {
  if (/\.mov$/i.test(name) || mime.includes("quicktime")) return "mov" as const;
  return "mp4" as const;
}

function tmpKey(uploadId: string, partNumber: number) {
  const safe = uploadId.replace(/[^a-z0-9_-]/gi, "").slice(0, 80);
  if (!safe) throw new Error("Yükleme oturumu geçersiz.");
  return `showcase/tmp/${safe}/${partNumber}`;
}

async function requireCatalogAdmin(request: Request) {
  const user = await requireMediaUser(request);
  if (!user) throw Object.assign(new Error("Oturum gerekli."), { status: 401 });
  if (!r2Configured()) {
    throw Object.assign(new Error("Dosya deposu bu ortamda bağlı değil. Sahte yükleme yapılmaz."), { status: 503 });
  }
  const sql = await getSql();
  try {
    await requireAdmin(sql, user.id);
  } catch {
    throw Object.assign(new Error("Bu işlem yalnızca yönetici hesabına açıktır."), { status: 403 });
  }
  try {
    await ensureShowcaseColumns(sql);
  } catch {
    /* ignore */
  }
  return sql;
}

async function ensureClipRow(
  sql: Awaited<ReturnType<typeof getSql>>,
  clipId: string,
  lane: ShowcaseLane,
  filename: string,
) {
  const [existing] = await sql<{ id: string; preview_url: string | null }>`
    select id, preview_url from showcase_clips where id = ${clipId}
  `;
  if (existing) return existing;
  const seed = [...DEFAULT_SHOWCASE, ...DEFAULT_DISCOVER].find((clip) => clip.id === clipId);
  const title = seed?.title || titleFromVideoFilename(filename);
  const scene = seed?.scene || `${title} sahnesi, sinematik hareket, fotogerçekçi görüntü`;
  const [maxRow] = await sql<{ n: number | null }>`
    select max(sort_order)::int as n from showcase_clips where lane = ${lane}
  `.catch(async () => sql<{ n: number | null }>`select max(sort_order)::int as n from showcase_clips`);
  const sortOrder = seed?.sortOrder ?? (maxRow?.n ?? 0) + 10;
  await sql`
    insert into showcase_clips (
      id, title, category, badge, sort_order, active, preview_url, poster_url,
      subject, scene, negative_prompt, style, camera, lighting, motion,
      duration_seconds, aspect, quality, model, seed, voice_mode,
      lane, tag, studio_path, prompt
    ) values (
      ${clipId}, ${title}, ${seed?.category || (lane === "kesfet" ? "Keşfet" : "İlham Al")}, ${seed?.badge || ""},
      ${sortOrder}, ${true}, ${seed?.previewUrl || ""}, ${seed?.posterUrl || ""},
      ${seed?.subject || title}, ${scene}, ${seed?.negativePrompt || "yazı, logo, altyazı"},
      ${seed?.style || "fotogerçekçi sinemat
... 