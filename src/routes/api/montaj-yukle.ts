import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import {
  persistBytesToR2,
  r2ClientUploadUrl,
  r2Configured,
  uploadObjectKey,
} from "@/lib/zunoza/r2";
import {
  classifyUpload,
  extForUpload,
  labelFromFilename,
  sniffAudioMime,
  UPLOAD_MAX_BYTES,
  uploadSizeError,
  type UploadKind,
} from "@/lib/zunoza/montage-upload";
import { sniffImageMime } from "@/lib/zunoza/image-request";
import { clampMontageDuration } from "@/lib/zunoza/montage-plan";

const ALLOWED_MIME: Record<UploadKind, Set<string>> = {
  video: new Set(["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/3gpp2", "video/x-m4v"]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  audio: new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/webm",
    "audio/x-m4a",
    "audio/m4a",
  ]),
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handleUpload(request: Request) {
  const user = await requireMediaUser(request);
  if (!user) return jsonError("Oturum gerekli.", 401);
  if (!r2Configured()) return jsonError("Dosya deposu bu ortamda bağlı değil. Sahte yükleme yapılmaz.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Yükleme okunamadı.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 32) return jsonError("Geçerli bir dosya seçin.");
  const kind = classifyUpload(file.type, file.name);
  if (!kind) return jsonError("Desteklenen türler: MP4/MOV video, JPG/PNG görsel, MP3/M4A/WAV ses.");
  const sizeErr = uploadSizeError(kind, file.size);
  if (sizeErr) return jsonError(sizeErr);
  const declared = (file.type || "").split(";")[0]!.trim().toLowerCase();
  const mime = declared || (kind === "video" ? "video/mp4" : kind === "image" ? "image/jpeg" : "audio/mpeg");
  if (!ALLOWED_MIME[kind].has(mime)) {
    return jsonError("Bu dosya biçimi desteklenmiyor.");
  }

  const sql = await getSql();
  const [today] = await sql<{ n: number }>`
    select count(*)::int as n from studio_uploads
    where user_id = ${user.id} and created_at >= current_date
  `;
  if ((today?.n ?? 0) >= 80) return jsonError("Günlük yükleme sınırına ulaşıldı. Yarın tekrar deneyin.", 429);

  const id = crypto.randomUUID();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > UPLOAD_MAX_BYTES[kind]) return jsonError(uploadSizeError(kind, bytes.byteLength) || "Dosya çok büyük.");
  let storedMime = mime;
  if (kind === "image") {
    const sniffed = sniffImageMime(bytes);
    if (!sniffed) {
      return jsonError("Görsel için JPG, PNG veya WebP kullanın. HEIC tarayıcıda dönüştürülemezse başka bir fotoğraf seçin.");
    }
    storedMime = sniffed;
  } else if (kind === "audio") {
    const sniffed = sniffAudioMime(bytes, mime);
    if (!sniffed) return jsonError("Ses için MP3, WAV, M4A veya OGG kullanın.");
    storedMime = sniffed;
  }
  const ext = extForUpload(kind, storedMime, file.name);
  let stored: string;
  try {
    stored = (await persistBytesToR2(uploadObjectKey(user.id, id, ext), bytes, storedMime, true)) || "";
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Dosya kaydedilemedi.", 502);
  }
  if (!stored) return jsonError("Dosya kalıcı olarak kaydedilemedi.", 502);

  const duration = clampMontageDuration(form.get("durationSeconds"), kind === "image" ? 30 : 180);
  const label = labelFromFilename(file.name);
  await sql`
    insert into studio_uploads (
      id, user_id, kind, label, mime_type, byte_size, duration_seconds, media_url, status
    ) values (
      ${id}, ${user.id}, ${kind}, ${label}, ${storedMime}, ${bytes.byteLength}, ${duration}, ${stored}, ${"tamamlandi"}
    )
  `;
  return new Response(
    JSON.stringify({
      id,
      kind,
      label,
      duration,
      url: r2ClientUploadUrl(id, stored),
      origin: "upload",
    }),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
}

export
... 