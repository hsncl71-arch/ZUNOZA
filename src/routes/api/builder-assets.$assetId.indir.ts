import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { getR2Object, isR2ObjectRef, r2ObjectKey } from "@/lib/zunoza/r2";

export const Route = createFileRoute("/api/builder-assets/$assetId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const user = await requireMediaUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const sql = await getSql();
        const rows = await sql<{ r2_key: string | null; file_name: string | null }>`
          select a.r2_key, a.file_name
          from builder_assets a
          join builder_projects p on p.id = a.project_id
          where a.id = ${params.assetId} and a.user_id = ${user.id} and p.user_id = ${user.id} and p.status <> ${"silindi"}
        `;
        const key = rows[0]?.r2_key;
        if (!key || !isR2ObjectRef(key)) return new Response("Bulunamadı", { status: 404 });
        const obj = await getR2Object(r2ObjectKey(key));
        if (!obj.ok) return new Response("Görsel alınamadı", { status: 502 });
        const mime = obj.contentType || "image/jpeg";
        const name = rows[0]?.file_name || `zunoza-${params.assetId}.jpg`;
        return new Response(obj.bytes, {
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `inline; filename="${name.replace(/[^\w.-]+/g, "_")}"`,
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
