/** grok-imagine-video-1.5 REST fields only — do not invent params. */

import { isSafeMediaSource } from "./safe-fetch.ts";
import { speechLanguageHint } from "./video-languages.ts";

export const XAI_VIDEO_MODEL = "grok-imagine-video-1.5";
export const XAI_ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] as const;
export type XaiAspect = (typeof XAI_ASPECTS)[number];
export const XAI_RESOLUTIONS = ["480p", "720p", "1080p"] as const;
export type XaiResolution = (typeof XAI_RESOLUTIONS)[number];

export type VideoQuality = "ekonomik" | "standart" | "hd" | "ultra";
/** Stored / API aliases. Product UI uses ProductVoiceMode. */
export type VideoVoiceMode = "sessiz" | "ortam" | "konusma" | "ozel" | "dogal" | "tts" | "muzik";
export type ProductVoiceMode = "sessiz" | "ortam" | "konusma" | "ozel";

const ASPECT_SET = new Set<string>(XAI_ASPECTS);

export function clampXaiAspect(aspect: string): XaiAspect {
  if (aspect === "4:5") return "3:4";
  if (aspect === "21:9") return "16:9";
  if (ASPECT_SET.has(aspect)) return aspect as XaiAspect;
  return "9:16";
}

export function xaiResolution(quality: VideoQuality, mode: "t2v" | "i2v" | "r2v"): XaiResolution {
  const wanted: XaiResolution = quality === "ekonomik" ? "480p" : quality === "ultra" ? "1080p" : "720p";
  if (mode === "r2v" && wanted === "1080p") return "720p";
  return wanted;
}

/** Imagine max is 15s. Legacy 30s dual-scene is not a product duration. */
export const PRODUCT_VIDEO_SECONDS = [5, 10, 15] as const;
export type ProductVideoSeconds = (typeof PRODUCT_VIDEO_SECONDS)[number];

export function assertProductVideoDuration(seconds: number): ProductVideoSeconds {
  if (seconds === 5 || seconds === 10 || seconds === 15) return seconds;
  throw new Error("Video süresi yalnızca 5, 10 veya 15 saniye olabilir.");
}

export function imagineDuration(seconds: number): ProductVideoSeconds {
  if (seconds <= 5) return 5;
  if (seconds <= 10) return 10;
  return 15;
}

export function videoMode(opts: {
  image?: string;
  referenceImages?: string[];
  lastFrame?: string;
}): "t2v" | "i2v" | "r2v" {
  if ((opts.referenceImages && opts.referenceImages.length > 0) || opts.lastFrame) return "r2v";
  if (opts.image) return "i2v";
  return "t2v";
}

function usableImageUrl(value: string | undefined) {
  if (!value) return "";
  if (isSafeMediaSource(value)) return value;
  return "";
}

export function normalizeVoiceMode(value: string | undefined): ProductVoiceMode {
  if (value === "sessiz") return "sessiz";
  if (value === "konusma" || value === "tts") return "konusma";
  if (value === "ozel") return "ozel";
  return "ortam";
}

export function wantsSilentAudio(voiceMode: string | undefined) {
  return normalizeVoiceMode(voiceMode) === "sessiz";
}

const SILENT_HINT =
  " Sessiz video: konuşma, anlatıcı, diyalog, müzik veya ortam sesi üretme. No speech, music, or ambient sound.";
const AMBIENT_HINT =
  " Yalnızca sahneye uygun gerçekçi ortam sesleri ve SFX üret (rüzgâr, yağmur, trafik, kapı, ayak sesi, elektrik, kalabalık, kuş, su, motor). İnsan konuşması, diyalog, anlatıcı, seslendirme, voiceover veya şarkı sözü EKLEME. No human speech, dialogue, or narration.";
const CUSTOM_FALLBACK =
  " Kullanıcının ses talimatına uy. Talimat konuşmayı yasaklıyorsa konuşma ekleme.";

export function voicePromptSuffix(opts: {
  voiceMode?: string;
  language?: string;
  voiceInstruction?: string;
}): string {
  const mode = normalizeVoiceMode(opts.voiceMode);
  if (mode === "sessiz") return SILENT_HINT;
  if (mode === "ortam") return AMBIENT_HINT;
  if (mode === "ozel") {
    const custom = opts.voiceInstruction?.trim();
    return custom ? ` Ses talimatı: ${custom.slice(0, 400)}` : CUSTOM_FALLBACK;
  }
  return speechLanguageHint(opts.language);
}

export function buildXaiVideoBody(input: {
  prompt: string;
  durationSeconds: number;
  aspect: string;
  quality: VideoQuality;
  image?: string;
  referenceImages?: string[];
  lastFrame?: string;
  voiceMode?: string;
}) {
  const refs = (input.referenceImages || []).map(usableImageUrl).filter(Boolean).slice(0, 7);
  const image = usableImageUrl(input.image);
  const lastFrame = usableImageUrl(input.lastFrame);
  const mode 
... 