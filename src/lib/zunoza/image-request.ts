/** grok-imagine-image REST fields only — do not invent params. */

import { isSafeMediaSource } from "./safe-fetch.ts";

export const IMAGE_MODELS = ["grok-imagine-image-2.0", "grok-imagine-image"] as const;
export const IMAGE_ASPECTS = [
  "1:1",
  "9:16",
  "16:9",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "2:1",
  "1:2",
  "21:9",
  "5:2",
  "auto",
] as const;
export type ImageAspect = (typeof IMAGE_ASPECTS)[number];
export type ImageResolution = "1k" | "2k";

const ASPECT_SET = new Set<string>(IMAGE_ASPECTS);
const MAX_DATA_BYTES = 6_000_000;
const MAX_REFERENCES = 5;

export function clampImageAspect(aspect: string | undefined): ImageAspect {
  if (aspect && ASPECT_SET.has(aspect)) return aspect as ImageAspect;
  return "1:1";
}

export function clampImageCount(n: number | undefined) {
  const v = Math.floor(Number(n) || 1);
  if (v < 1) return 1;
  if (v > 10) return 10;
  return v;
}

export function clampResolution(value: string | undefined): ImageResolution {
  return value === "2k" ? "2k" : "1k";
}

function headerOf(bytes: Uint8Array) {
  return bytes.subarray(0, 12);
}

export function sniffImageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length < 12) return null;
  const h = headerOf(bytes);
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return "image/jpeg";
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return "image/png";
  if (
    h[0] === 0x52 &&
    h[1] === 0x49 &&
    h[2] === 0x46 &&
    h[3] === 0x46 &&
    h[8] === 0x57 &&
    h[9] === 0x45 &&
    h[10] === 0x42 &&
    h[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function parseImageDataUrl(value: string) {
  const match = value.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const declared = match[1]!.toLowerCase().replace("image/jpg", "image/jpeg");
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(match[2]!.replace(/\s+/g, ""), "base64"));
  } catch {
    return null;
  }
  if (bytes.byteLength < 32 || bytes.byteLength > MAX_DATA_BYTES) return null;
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) return null;
  if (declared === "image/jpeg" && sniffed !== "image/jpeg") return null;
  if (declared === "image/png" && sniffed !== "image/png") return null;
  if (declared === "image/webp" && sniffed !== "image/webp") return null;
  return { mime: sniffed, bytes, url: `data:${sniffed};base64,${Buffer.from(bytes).toString("base64")}` };
}

export function usableImageUrls(values: Array<string | undefined>) {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (value.startsWith("https://") || value.startsWith("http://")) {
      if (isSafeMediaSource(value)) out.push(value);
      continue;
    }
    const parsed = parseImageDataUrl(value);
    if (parsed) out.push(parsed.url);
  }
  return out.slice(0, MAX_REFERENCES);
}

function imageObj(url: string) {
  return { url, type: "image_url" as const };
}

export function buildImageGenerateBody(input: {
  prompt: string;
  aspect: string;
  n?: number;
  resolution?: string;
  model: string;
}) {
  return {
    model: input.model,
    prompt: input.prompt,
    n: clampImageCount(input.n),
    aspect_ratio: clampImageAspect(input.aspect),
    resolution: clampResolution(input.resolution),
    response_format: "url",
  };
}

export function buildImageEditBody(input: {
  prompt: string;
  images: string[];
  aspect?: string;
  n?: number;
  resolution?: string;
  model: string;
}) {
  const refs = usableImageUrls(input.images);
  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    n: clampImageCount(input.n),
    resolution: clampResolution(input.resolution),
    response_format: "url",
  };
  if (input.aspect) body.aspect_ratio = clampImageAspect(input.aspect);
  if (refs.length > 1) body.images = refs.map(imageObj);
  else if (refs[0]) body.image = imageObj(refs[0]);
  return body;
}

export const MAX_IMAGE_REFERENCES = 
... 