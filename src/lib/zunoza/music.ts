import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { assertCanUseStudio } from "@/lib/zunoza/access";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import { recordConsent } from "@/lib/zunoza/privacy";
import { logUsageEvent } from "@/lib/zunoza/usage";
import { assertAiRateLimit, logAiUsage, publicAiError } from "@/lib/zunoza/ai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateChatUsd, estimateMusicUsd, estimateTtsUsd } from "@/lib/zunoza/provider-cost";
import {
  assertFreeTierAllows,
  assertNotDuplicate,
  chargeCredits,
  refundCredits,
  readFeatureCreditMap,
} from "@/lib/zunoza/credits";
import { musicCredits, voiceSongCredits } from "@/lib/zunoza/credit-economy";
import {
  assertMusicStyleInput,
  composeMusicStyleBlock,
  normalizeMusicStyleId,
  storedMusicGenre,
} from "@/lib/zunoza/music-style";
import { sniffAudioMime } from "@/lib/zunoza/montage-upload";
import {
  musicObjectKey,
  persistBytesToR2,
  probeR2Write,
  r2ClientMusicUrl,
  r2Configured,
  r2EndpointKind,
  removeOwnedStoredMedia,
} from "@/lib/zunoza/r2";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_MUSIC_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

export type MusicAsset = {
  id: string;
  prompt: string;
  genre: string | null;
  mood: string | null;
  durationSeconds: number;
  instrumental: boolean;
  audioUrl: string | null;
  storedOnR2: boolean;
  mimeType: string;
  byteSize: number | null;
  source: "generated" | "upload";
  trimStart: number;
  trimEnd: number;
  volume: number;
  createdAt: string;
};

function elevenKey() {
  const raw = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || "";
  return raw
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "");
}

type ElevenProbe = { ok: boolean; reason: string };
let elevenProbeCache: { at: number; result: ElevenProbe } | null = null;
const MUSIC_MODELS = ["music_v2_5", "music_v2", "music_v1"] as const;
const globalMusic = globalThis as typeof globalThis & { __zunozaMusicModel__?: string };

export function musicProviderReady() {
  return Boolean(elevenKey());
}

function extForMime(mime: string) {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("m4a") || mime.includes("mp4") || mime.includes("aac")) return "m4a";
  return "mp3";
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function mapAsset(row: Record<string, unknown>): MusicAsset {
  const id = String(row.id);
  const stored = row.audio_url ? String(row.audio_url) : null;
  const duration = Math.max(1, Number(row.duration_seconds ?? 15));
  const trimStart = clamp(Number(row.trim_start ?? 0), 0, duration);
  const rawEnd = row.trim_end == null ? duration : Number(row.trim_end);
  const trimEnd = clamp(rawEnd, trimStart + 0.2, duration);
  const volume = clamp(Number(row.volume ?? 1), 0, 1);
  const source = String(row.source ?? "generated") === "upload" ? "upload" : "generated";
  return {
    id,
    prompt: String(row.prompt),
    genre: row.genre ? String(row.genre) : null,
    mood: row.mood ? String(row.mood) : null,
    durationSeconds: duration,
    instrumental: Boolean(row.instrumental),
    audioUrl: r2ClientMusicUrl(id, stored),
    storedOnR2: Boolean(stored && stored.startsWith("r2:")),
    mimeType: String(row.mime_type ?? "audio/mpeg"),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    source,
    trimStart,
    trimEnd,
    volume,
    createdAt: String(row.created_at),
  };
}

function decodeBase64(raw: string) {
  const b64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  return Buffer.from(b64, "base64");
}

function elevenDetail(json: unknown, status: number) {
  const row = (json || {}) as { detail?: unknown; message?: string };
  const detail = row.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const d = item as { message?: string; msg?: string };
        return d.message || d.msg || "";
      })
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }
  if (detail && typeof detail === "object") {
    const d = detail as { message?: string; msg?: string };
    if (d.message || d.msg) return String(d.message || d.msg);
  }
  if (row.message) return row.message;
  if (status === 401) return "Müzik sağlayıcısı yanıt vermedi.";
  return `Müzik üretilemedi (${status}).`;
}

async function probeEleven() {
  const cached = elevenProbeCache;
  if (cached && Date.now() - cached.at < 60_000) return cached.result;
  const apiKey = elevenKey();
  if (!apiKey) {
    const result = { ok: false as const, reason: "missing_key" };
    elevenProbeCache = { at: Date.now(), result };
    return result;
  }
  const res = await fetch("https://api.elevenlabs.io/v1/user", {
    headers: { "xi-api-key": apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) {
    const result = { ok: true as const, reason: "ok" };
    elevenProbeCache = { at: Date.now(), result };
    return result;
  }
  if (res.status === 401) {
    const alt = await fetch("https://api.elevenlabs.io/v1/models", {
      headers: { "xi-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (alt.ok) {
      const result = { ok: true as const, reason: "ok" };
      elevenProbeCache = { at: Date.now(), result };
      return result;
    }
    const result = { ok: false as const, reason: "invalid_key" };
    elevenProbeCache = { at: Date.now(), result };
    return result;
  }
  if (res.status === 403) {
    const result = { ok: false as const, reason: "no_permission" };
    elevenProbeCache = { at: Date.now(), result };
    return result;
  }
  const result = { ok: false as const, reason: `http_${res.status}` };
  elevenProbeCache = { at: Date.now(), result };
  return result;
}

async function composeMusic(
  apiKey: string,
  prompt: string,
  durationMs: number,
  instrumental: boolean,
  lyricLines: string[] = [],
) {
  const models = globalMusic.__zunozaMusicModel__
    ? [globalMusic.__zunozaMusicModel__, ...MUSIC_MODELS]
    : [...MUSIC_MODELS];
  const unique = [...new Set(models)];
  let last = "Müzik üretilemedi.";
  const wantVocals = !instrumental && lyricLines.length > 0;
  for (const model of unique) {
    const payloads: Record<string, unknown>[] = [
      {
        prompt: prompt.slice(0, 4000),
        music_length_ms: durationMs,
        model_id: model,
        force_instrumental: instrumental,
      },
    ];
    if (wantVocals) {
      payloads.unshift({
        prompt: prompt.slice(0, 4000),
        music_length_ms: durationMs,
        model_id: model,
        force_instrumental: false,
        composition_plan: {
          positive_global_styles: ["turkish sung vocals", "lead vocal"],
          negative_global_styles: ["instrumental only", "karaoke minus vocals"],
          sections: [
            {
              section_name: "Song",
              positive_local_styles: ["turkish lyrics", "sung vocal"],
              duration_ms: durationMs,
              lines: lyricLines.slice(0, 24),
            },
          ],
        },
      });
    }
    for (const body of payloads) {
      const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      if (res.status === 429) throw new Error("Müzik kotası doldu. Lütfen biraz bekleyin.");
      const type = (res.headers.get("content-type") || "").toLowerCase();
      if (res.ok && !type.includes("json")) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength >= 64) {
          globalMusic.__zunozaMusicModel__ = model;
          return { bytes, mime: type.split(";")[0]!.trim() || "audio/mpeg" };
        }
        last = "Sağlayıcı müzik döndürmedi.";
        continue;
      }
      const err = await res.json().catch(() => ({}));
      last = elevenDetail(err, res.status);
      if (res.status === 401) throw new Error("Müzik sağlayıcısı yanıt vermedi.");
      if (res.status !== 400 && res.status !== 404 && res.status !== 422) throw new Error(publicAiError(last));
    }
  }
  if (wantVocals) {
    throw new Error(
      "Bağlı müzik altyapısı bu sözleri vokal şarkı olarak üretemedi. Enstrümantal seçin veya sözleri kısaltıp tekrar deneyin. Sahte sözlü şarkı üretilmez.",
    );
  }
  throw new Error(publicAiError(last));
}

export async function musicConnectionStatus(probeWrite = false) {
  const probe = await probeEleven();
  const lyricsReady = Boolean(process.env.XAI_API_KEY?.trim());
  const configured = r2Configured();
  const write = probeWrite && configured ? await probeR2Write() : null;
  const r2Ready = configured && (write ? write.ok : true);
  return {
    ready: probe.ok,
    lyricsReady,
    r2Ready,
    r2Write: write ? write.ok : null,
    r2WriteStatus: write ? write.status : null,
    r2WriteCode: write ? write.code : null,
    r2Region: "auto",
    r2HostKind: r2EndpointKind(),
    eleven: probe.reason,
  };
}

export const getMusicStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => musicConnectionStatus());

export const generateStudioMusic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      prompt: string;
      lyrics?: string;
      genre?: string;
      styleId?: string;
      styleNote?: string;
      mood?: string;
      durationSeconds?: number;
      instrumental?: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const prompt = data.prompt.trim().slice(0, 2000);
    if (prompt.length < 8) throw new Error("Müzik için sahneyi biraz daha ayrıntılı anlatın.");
    assertSafeGeneration(prompt, data.lyrics, data.styleNote);
    await assertAiRateLimit(context.userId, "music_generate", 8);
    const sqlGate = await getSql();
    await assertCanUseStudio(sqlGate, context.userId, "muzik");
    const apiKey = elevenKey();
    if (!apiKey) throw new Error("Şarkı üretimi bu ortamda bağlı değil. Sahte müzik üretilmez.");

    const durationSeconds = [15, 30, 45].includes(data.durationSeconds ?? 15)
      ? (data.durationSeconds ?? 15)
      : 15;
    const lyrics = data.lyrics?.trim().slice(0, 2500) || "";
    const instrumental = lyrics.length < 12 ? true : data.instrumental === true;
    if (data.instrumental === false && lyrics.length < 12) {
      throw new Error("Türkçe sözlü vokal için şarkı sözü yazın veya yapay zekâya yazdırın.");
    }
    const styled = assertMusicStyleInput(data.styleId || data.genre || "sinematik", data.styleNote);
    const genre = storedMusicGenre(styled.styleId, styled.styleNote);
    const mood = data.mood?.trim().slice(0, 40) || "Epik";
    const styleBlock = composeMusicStyleBlock({
      styleId: styled.styleId,
      styleNote: styled.styleNote,
      mood,
    });
    const estUsd = estimateMusicUsd(durationSeconds);
    await assertSpendCap(estUsd, { userId: context.userId, kind: "music_generate" });
    await assertFreeTierAllows(sqlGate, context.userId, { feature: "muzik" });
    assertNotDuplicate(context.userId, "music_generate");
    const jobId = crypto.randomUUID();
    const catalog = await readFeatureCreditMap();
    const credits = musicCredits(durationSeconds, catalog);
    const billed = await chargeCredits(sqlGate, {
      userId: context.userId,
      jobId,
      kind: "muzik",
      amount: credits,
      note: `Müzik üretimi ${durationSeconds}s`,
    });
    try {
    const composed = [
      prompt,
      lyrics ? `Şarkı sözleri:\n${lyrics}` : "",
      styleBlock,
      instrumental || !lyrics ? "Sözsüz enstrümantal parça." : "Türkçe sözlü vokal şarkı.",
    ]
      .filter(Boolean)
      .join(" ");

    const res = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "appli
... 