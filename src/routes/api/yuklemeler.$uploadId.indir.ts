import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { getR2Object, isR2ObjectRef, r2ObjectKey } from "@/lib/zunoza/r2";
import { serveStoredVideo } from "@/lib/zunoza/media-stream";

async function uploadResponse(uploadId: string, request: Request) {
  const user = await requireMediaUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const sql = await getSql();
  const rows = await sql<{ media_url: string | null; mime_type: string | null; kind: string | null; label: string | null }>`
    select media_url, mime_type, kind, label from studio_uploads
    where id = ${uploadId} and user_id = ${user.id}
  `;
  const row = rows[0];
  const url = row?.media_url;
  if (!url) return new Response("Bulunamadı", { status: 404 });
  const mime = row.mime_type || "application/octet-stream";
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("jpeg") || mime.includes("jpg")
        ? "jpg"
        : mime.includes("webm")
          ? "webm"
          : mime.includes("quicktime") || mime.includes("mov")
            ? "mov"
            : row.kind === "audio"
              ? "mp3"
              : row.kind === "image"
                ? "jpg"
                : "mp4";
  const filename = `zunoza-yukleme-${uploadId}.${ext}`;

  if (row.kind === "video" || mime.startsWith("video/")) {
    return serveStoredVideo(url, request, filename);
  }

  if (!isR2ObjectRef(url)) return new Response("Dosya alınamadı", { status: 502 });
  const obj = await getR2Object(r2ObjectKey(url));
  if (!obj.ok) return new Response("Dosya alınamadı", { status: 502 });
  return new Response(obj.bytes, {
    headers: {
      "Content-Type": obj.contentType || mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/yuklemeler/$uploadId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => uploadResponse(params.uploadId, request),
      HEAD: async ({ params, request }) => uploadResponse(params.uploadId, request),
    },
  },
});
