import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { getR2Object, isR2ObjectRef, r2ObjectKey } from "@/lib/zunoza/r2";
import { fetchAllowedHttps } from "@/lib/zunoza/safe-fetch";

export const Route = createFileRoute("/api/gorseller/$imageId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const user = await requireMediaUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const sql = await getSql();
        const rows = await sql<{ image_url: string | null; mime_type: string | null }>`
          select image_url, mime_type from image_assets
          where id = ${params.imageId} and user_id = ${user.id}
        `;
        const url = rows[0]?.image_url;
        if (!url) return new Response("Bulunamadı", { status: 404 });

        if (isR2ObjectRef(url)) {
          const obj = await getR2Object(r2ObjectKey(url));
          if (!obj.ok) return new Response("Görsel alınamadı", { status: 502 });
          const mime = obj.contentType || rows[0]?.mime_type || "image/jpeg";
          const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
          return new Response(obj.bytes, {
            headers: {
              "Content-Type": mime,
              "Content-Disposition": `inline; filename="zunoza-gorsel-${params.imageId}.${ext}"`,
              "Cache-Control": "private, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        const media = await fetchAllowedHttps(url, 30_000);
        if (!media?.ok || !media.body) return new Response("Görsel alınamadı", { status: 502 });
        return new Response(media.body, {
          headers: {
            "Content-Type": media.headers.get("content-type") || rows[0]?.mime_type || "image/jpeg",
            "Content-Disposition": `inline; filename="zunoza-gorsel-${params.imageId}.jpg"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
