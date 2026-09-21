import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { serveStoredVideo } from "@/lib/zunoza/media-stream";

async function videoResponse(jobId: string, request: Request) {
  const user = await requireMediaUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const sql = await getSql();
  const rows = await sql<{ video_url: string | null }>`
    select video_url from video_jobs where id = ${jobId} and user_id = ${user.id}
  `;
  const url = rows[0]?.video_url;
  if (!url) return new Response("Bulunamadı", { status: 404 });
  return serveStoredVideo(url, request, `zunoza-${jobId}.mp4`);
}

export const Route = createFileRoute("/api/videolar/$jobId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => videoResponse(params.jobId, request),
      HEAD: async ({ params, request }) => videoResponse(params.jobId, request),
    },
  },
});
