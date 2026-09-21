import { AwsClient } from "aws4fetch";
import { fetchAllowedHttps } from "./safe-fetch.ts";

const R2_KEY_PREFIX = "r2:";
const DEFAULT_BUCKET = "zunoza-media";

type R2Config = {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  host: string;
  publicBaseUrl: string | null;
};

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim().replace(/\s+/g, "");
    if (value) return value;
  }
  return undefined;
}

export function isR2ObjectRef(value: string | null | undefined) {
  return Boolean(value && value.startsWith(R2_KEY_PREFIX));
}

export function r2ObjectKey(value: string) {
  return value.startsWith(R2_KEY_PREFIX) ? value.slice(R2_KEY_PREFIX.length) : value;
}

export function r2ObjectRef(key: string) {
  return `${R2_KEY_PREFIX}${key}`;
}

export function isTransientVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  return /vidgen\.x\.ai|xai-vidgen/i.test(url);
}

export function videoObjectKey(userId: string, jobId: string) {
  return `videos/${userId}/${jobId}.mp4`;
}

export function imageObjectKey(userId: string, imageId: string, ext = "jpg") {
  return `images/${userId}/${imageId}.${ext}`;
}

export function audioObjectKey(userId: string, audioId: string, ext = "mp3") {
  return `audio/${userId}/${audioId}.${ext}`;
}

export function musicObjectKey(userId: string, musicId: string, ext = "mp3") {
  return `music/${userId}/${musicId}.${ext}`;
}

export function montageObjectKey(userId: string, projectId: string) {
  return `montages/${userId}/${projectId}.mp4`;
}

export function askAttachmentObjectKey(userId: string, attachmentId: string, ext = "jpg") {
  const safe = /^[a-z0-9]{2,8}$/i.test(ext) ? ext.toLowerCase() : "jpg";
  return `ask/${userId}/${attachmentId}.${safe}`;
}

export function uploadObjectKey(userId: string, uploadId: string, ext: string) {
  const safe = /^[a-z0-9]{2,8}$/i.test(ext) ? ext.toLowerCase() : "bin";
  return `uploads/${userId}/${uploadId}.${safe}`;
}

export function showcaseObjectKey(lane: string, clipId: string, ext: string) {
  const safeLane = lane === "kesfet" ? "kesfet" : "ilham";
  const safeId = clipId.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "clip";
  const safeExt = /^[a-z0-9]{2,8}$/i.test(ext) ? ext.toLowerCase() : "mp4";
  return `showcase/${safeLane}/${safeId}/${crypto.randomUUID()}.${safeExt}`;
}

function r2EndpointRaw() {
  const explicit = firstEnv("R2_ENDPOINT", "MEDIA_S3_ENDPOINT");
  if (explicit) {
    const trimmed = explicit.trim().replace(/\/$/, "");
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      const bucketHost = parsed.hostname.match(/^(.+)\.([a-f0-9]{32})\.r2\.cloudflarestorage\.com$/i);
      if (bucketHost) return `https://${bucketHost[2]}.r2.cloudflarestorage.com`;
      return parsed.origin;
    } catch {
      return withScheme;
    }
  }
  const accountId = firstEnv("R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID")?.trim();
  if (accountId && /^[a-fA-F0-9]{32}$/.test(accountId)) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  return undefined;
}

function getR2Config(): R2Config | null {
  const accessKeyId = firstEnv("R2_ACCESS_KEY_ID", "MEDIA_S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID");
  const secretAccessKey = firstEnv(
    "R2_SECRET_ACCESS_KEY",
    "MEDIA_S3_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
  );
  const endpointRaw = r2EndpointRaw();
  if (!accessKeyId || !secretAccessKey || !endpointRaw) return null;
  const endpoint = endpointRaw.replace(/\/$/, "");
  let host: string;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:") return null;
    host = parsed.host;
  } catch {
    return null;
  }
  const publicRaw = firstEnv("R2_PUBLIC_BASE_URL", "MEDIA_S3_PUBLIC_BASE_URL")?.replace(/\/$/, "") ?? null;
  return {
    bucket: firstEnv("R2_BUCKET", "MEDIA_S3_BUCKET") ?? DEFAULT_BUCKET,
    accessKeyId,
    secretAccessKey,
    endpoint,
    region: "auto",
    host,
    publicBaseUrl: publicRaw && publicRaw.startsWith("https://") ? publicRaw : null,
  };
}

export function r2Configured() {
  return getR2Config() !== null;
}

export function r2MissingEnvNames() {
  const missing: string[] = [];
  if (!firstEnv("R2_ACCESS_KEY_ID", "MEDIA_S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID")) {
    missing.push("R2_ACCESS_KEY_ID");
  }
  if (!firstEnv("R2_SECRET_ACCESS_KEY", "MEDIA_S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY")) {
    missing.push("R2_SECRET_ACCESS_KEY");
  }
  if (!r2EndpointRaw()) missing.push("R2_ENDPOINT");
  return missing;
}

function safeObjectKey(key: string) {
  const clean = key.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!/^[A-Za-z0-9/_.-]+$/.test(clean)) throw new Error("Geçersiz medya anahtarı.");
  return clean;
}

function sha256Hex(data: string | Uint8Array | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  ret
... 