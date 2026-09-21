import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { serveStoredVideo } from "@/lib/zunoza/media-stream";

async function montageResponse(projectId: string, request: Request) {
  const user = await requireMediaUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const sql = await getSql();
  const rows = await sql<{ output_url: string | null }>`
    select output_url from montage_projects
    where id = ${projectId} and user_id = ${user.id}
  `;
  const url = rows[0]?.output_url;
  if (!url) return new Response("Bulunamadı", { status: 404 });
  return serveStoredVideo(url, request, `zunoza-montaj-${projectId}.mp4`);
}

export const Route = createFileRoute("/api/montajlar/$projectId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => montageResponse(params.projectId, request),
      HEAD: async ({ params, request }) => montageResponse(params.projectId, request),
    },
  },
});
