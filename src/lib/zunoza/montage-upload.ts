/** Client-safe upload helpers for Montage Studio. No Node APIs. */

export const UPLOAD_MAX_BYTES = {
  video: 40 * 1024 * 1024,
  image: 8 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
} as const;

export type UploadKind = keyof typeof UPLOAD_MAX_BYTES;

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|3gpp)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|webm|caf)$/i;

export function classifyUpload(mime: string, name: string): UploadKind | null {
  const type = (mime || "").split(";")[0]!.trim().toLowerCase();
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (VIDEO_EXT.test(name)) return "video";
  if (IMAGE_EXT.test(name)) return "image";
  if (AUDIO_EXT.test(name)) return "audio";
  return null;
}

/** Magic-byte sniff for user-supplied audio. Declared MIME is only a hint for ftyp/webm. */
export function sniffAudioMime(
  bytes: Uint8Array,
  declared?: string,
): "audio/mpeg" | "audio/wav" | "audio/ogg" | "audio/mp4" | "audio/webm" | null {
  if (bytes.byteLength < 12) return null;
  const b = bytes;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "audio/mpeg";
  if (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) return "audio/mpeg";
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x41 &&
    b[10] === 0x56 &&
    b[11] === 0x45
  ) {
    return "audio/wav";
  }
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "audio/ogg";
  const hint = (declared || "").split(";")[0]!.trim().toLowerCase();
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return hint.startsWith("audio/") ? "audio/webm" : null;
  }
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (/^M4[AB] /i.test(brand)) return "audio/mp4";
    if (/^(isom|iso2|mp41|mp42)/i.test(brand) && /^audio\/(mp4|m4a|x-m4a|aac)$/.test(hint)) return "audio/mp4";
    return null;
  }
  return null;
}

export function acceptForUpload(kind?: UploadKind | "all") {
  if (kind === "video") return "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm";
  if (kind === "image") return "image/*,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif";
  if (kind === "audio") return "audio/*,audio/mpeg,audio/mp4,audio/aac,audio/wav,.mp3,.m4a,.aac,.wav,.ogg";
  return "video/*,image/*,audio/*,video/mp4,video/quicktime,image/jpeg,audio/mpeg,.mp4,.mov,.jpg,.png,.mp3,.m4a,.wav";
}

export function uploadSizeError(kind: UploadKind, bytes: number) {
  const max = UPLOAD_MAX_BYTES[kind];
  if (bytes <= max) return null;
  const mb = Math.round(max / (1024 * 1024));
  if (kind === "video") return `Video ${mb} MB sınırını aşıyor. Daha kısa bir klip seçin.`;
  if (kind === "image") return `Görsel ${mb} MB sınırını aşıyor.`;
  return `Ses dosyası ${mb} MB sınırını aşıyor.`;
}

export function extForUpload(kind: UploadKind, mime: string, name: string) {
  const lower = `${mime} ${name}`.toLowerCase();
  if (kind === "image") {
    if (lower.includes("png")) return "png";
    if (lower.includes("webp")) return "webp";
    return "jpg";
  }
  if (kind === "audio") {
    if (lower.includes("wav")) return "wav";
    if (lower.includes("ogg")) return "ogg";
    if (lower.includes("m4a") || lower.includes("mp4") || lower.includes("aac")) return "m4a";
    return "mp3";
  }
  if (lower.includes("webm")) return "webm";
  if (lower.includes("quicktime") || lower.includes(".mov")) return "mov";
  return "mp4";
}

export function labelFromFilename(name: string) {
  return (name || "Yükleme").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 80) || "Yükleme";
}

export function readMediaDuration(file: File, kind: UploadKind): Promise<number> {
  if (kind === "image") return Promise.resolve(5);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind === "audio" ? "audio" : "video");
    const finish = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const raw = Number(el.duration);
      if (!Number.isFinite(raw) || raw <= 0 || raw === Infinity) {
        finish(kind === "audio" ? 15 : 10);
        return;
      }
      finish(Math.round(raw * 10) / 10);
    };
    el.onerror = () => finish(kind === "audio" ? 15 : 10);
    window.setTimeout(() => finish(kind === "audio" ? 15 : 10), 4000);
    el.src = url;
  });
}

export async function prepareUploadFile(file: File, kind: UploadKind): Promise<File> {
  if (kind !== "image") return file;
  const type = (file.type || "").toLowerCase();
  if (type === "image/jpeg" || type === "image/png" || type === "image/webp") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1920;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    
... 