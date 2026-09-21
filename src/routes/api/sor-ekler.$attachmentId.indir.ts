import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { getR2Object, isR2ObjectRef, r2ObjectKey } from "@/lib/zunoza/r2";

async function attachmentResponse(attachmentId: string, request: Request) {
  const user = await requireMediaUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const sql = await getSql();
  const rows = await sql<{ object_key: string | null; mime_type: string | null }>`
    select object_key, mime_type from ask_attachments
    where id = ${attachmentId} and user_id = ${user.id}
    limit 1
  `;
  const row = rows[0];
  const stored = row?.object_key;
  if (!stored || !isR2ObjectRef(stored)) return new Response("Bulunamadı", { status: 404 });
  const obj = await getR2Object(r2ObjectKey(stored));
  if (!obj.ok || !("bytes" in obj) || !obj.bytes) return new Response("Dosya alınamadı", { status: 502 });
  const mime = row.mime_type || obj.contentType || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return new Response(obj.bytes, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="zunoza-sor-${attachmentId}.${ext}"`,
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/sor-ekler/$attachmentId/indir")({
  server: {
    handlers: {
      GET: async ({ params, request }) => attachmentResponse(params.attachmentId, request),
      HEAD: async ({ params, request }) => attachmentResponse(params.attachmentId, request),
    },
  },
});
