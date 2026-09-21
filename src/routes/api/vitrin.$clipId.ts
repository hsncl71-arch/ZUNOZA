import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { serveStoredVideo } from "@/lib/zunoza/media-stream";

function filenameOf(clipId: string, stored: string) {
  const ext = /\.mov$/i.test(stored) ? "mov" : "mp4";
  return `zunoza-vitrin-${clipId}.${ext}`;
}

async function catalogResponse(clipId: string, request: Request) {
  const id = String(clipId || "").trim();
  if (!id || id.length > 40) return new Response("Bulunamadı", { status: 404 });
  const sql = await getSql();
  const rows = await sql<{ preview_url: string | null; active: boolean }>`
    select preview_url, active from showcase_clips where id = ${id}
  `;
  const row = rows[0];
  const url = row?.preview_url;
  if (!url || row.active === false) return new Response("Bulunamadı", { status: 404 });
  if (url.startsWith("/showcase/") && !url.includes("..")) {
    return Response.redirect(url, 302);
  }
  return serveStoredVideo(url, request, filenameOf(id, url));
}

export const Route = createFileRoute("/api/vitrin/$clipId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => catalogResponse(params.clipId, request),
      HEAD: async ({ params, request }) => catalogResponse(params.clipId, request),
    },
  },
});
