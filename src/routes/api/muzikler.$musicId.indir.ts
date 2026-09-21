import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { getR2Object, isR2ObjectRef, r2ObjectKey } from "@/lib/zunoza/r2";
import { fetchAllowedHttps } from "@/lib/zunoza/safe-fetch";

export const Route = createFileRoute("/api/muzikler/$musicId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const user = await requireMediaUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const sql = await getSql();
        const rows = await sql<{ audio_url: string | null; mime_type: string | null }>`
          select audio_url, mime_type from music_assets
          where id = ${params.musicId} and user_id = ${user.id}
        `;
        const url = rows[0]?.audio_url;
        if (!url) return new Response("Bulunamadı", { status: 404 });

        if (isR2ObjectRef(url)) {
          const obj = await getR2Object(r2ObjectKey(url));
          if (!obj.ok) return new Response("Müzik alınamadı", { status: 502 });
          const mime = obj.contentType || rows[0]?.mime_type || "audio/mpeg";
          return new Response(obj.bytes, {
            headers: {
              "Content-Type": mime,
              "Content-Disposition": `inline; filename="zunoza-muzik-${params.musicId}.mp3"`,
              "Cache-Control": "private, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        const media = await fetchAllowedHttps(url, 30_000);
        if (!media?.ok || !media.body) return new Response("Müzik alınamadı", { status: 502 });
        return new Response(media.body, {
          headers: {
            "Content-Type": media.headers.get("content-type") || rows[0]?.mime_type || "audio/mpeg",
            "Content-Disposition": `inline; filename="zunoza-muzik-${params.musicId}.mp3"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
