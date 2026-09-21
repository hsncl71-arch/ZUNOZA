import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { assertCanUseStudio } from "@/lib/zunoza/access";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import { logUsageEvent } from "@/lib/zunoza/usage";
import { fetchAllowedHttps, isSafeMediaSource } from "@/lib/zunoza/safe-fetch";
import { assertAiRateLimit, logAiUsage, publicAiError } from "@/lib/zunoza/ai-usage";
import { parseXaiUsage, xaiLogFields } from "@/lib/zunoza/xai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateImageUsd } from "@/lib/zunoza/provider-cost";
import { beginPersist, endPersist } from "@/lib/zunoza/resilience";
import {
  assertFreeTierAllows,
  assertNotDuplicate,
  chargeCredits,
  refundCredits,
  readFeatureCreditMap,
} from "@/lib/zunoza/credits";
import { imageCredits } from "@/lib/zunoza/credit-economy";
import {
  imageObjectKey,
  isR2ObjectRef,
  persistBytesToR2,
  r2ClientImageUrl,
  r2Configured,
  removeOwnedStoredMedia,
} from "@/lib/zunoza/r2";
import {
  buildImageEditBody,
  buildImageGenerateBody,
  clampImageAspect,
  clampImageCount,
  clampResolution,
  IMAGE_MODELS,
  parseImageDataUrl,
  type ImageAspect,
  type ImageResolution,
} from "@/lib/zunoza/image-request";

export type { ImageAspect, ImageResolution };

export type ImageAsset = {
  id: string;
  prompt: string;
  aspect: string;
  style: string | null;
  model: string;
  imageUrl: string | null;
  storedOnR2: boolean;
  mimeType: string;
  byteSize: number | null;
  createdAt: string;
};

function extForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function mapImage(row: Record<string, unknown>): ImageAsset {
  const id = String(row.id);
  const stored = row.image_url ? String(row.image_url) : null;
  return {
    id,
    prompt: String(row.prompt),
    aspect: String(row.aspect),
    style: row.style ? String(row.style) : null,
    model: String(row.model),
    imageUrl: r2ClientImageUrl(id, stored),
    storedOnR2: Boolean(stored && stored.startsWith("r2:")),
    mimeType: String(row.mime_type ?? "image/jpeg"),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    createdAt: String(row.created_at),
  };
}

async function fetchImageBytes(url: string) {
  const res = await fetchAllowedHttps(url, 30_000);
  if (!res?.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 32) return null;
  const mime = res.headers.get("content-type") || "image/jpeg";
  return { bytes, mime };
}

function decodeB64(b64: string) {
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf);
}

type ProviderRow = { url?: string; b64_json?: string; mime_type?: string };

async function xaiImageRequest(apiKey: string, url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: ProviderRow[];
    error?: { message?: string };
    message?: string;
    usage?: unknown;
  };
  return { res, json };
}

async function persistImageAsset(
  userId: string,
  prompt: string,
  aspect: string,
  style: string | null,
  bytes: Uint8Array | null,
  mime: string,
  providerUrl: string | null,
  model: string,
) {
  const id = crypto.randomUUID();
  let stored = providerUrl;
  const byteSize = bytes?.byteLength ?? null;
  if (bytes && r2Configured()) {
    const ref = await persistBytesToR2(imageObjectKey(userId, id, extForMime(mime)), bytes, mime);
    if (ref) stored = ref;
  }
  if (!stored) throw new Error("Görsel kaydedilemedi.");
  const sql = await getSql();
  await sql`
    insert into image_assets (
      id, user_id, prompt, aspect, style, model, image_url, mime_type, byte_size, status
    ) values (
      ${id}, ${userId}, ${prompt}, ${aspect}, ${style},
      ${model}, ${stored}, ${mime}, ${byteSize}, ${"tamamlandi"}
    )
  `;
  const [saved] = await sql<Record<string, unknown>>`
    select * from image_assets where id = ${id} and user_id = ${userId}
  `;
  return mapImage(sa
... 