import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { assertCanUseStudio } from "@/lib/zunoza/access";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import {
  audioObjectKey,
  persistBytesToR2,
  r2ClientAudioUrl,
  r2Configured,
  removeOwnedStoredMedia,
} from "@/lib/zunoza/r2";
import { logUsageEvent } from "@/lib/zunoza/usage";
import { logAiUsage, assertAiRateLimit } from "@/lib/zunoza/ai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateTtsUsd } from "@/lib/zunoza/provider-cost";
import { assertFreeTierAllows, assertNotDuplicate, chargeCredits, refundCredits, readFeatureCreditMap } from "@/lib/zunoza/credits";
import { ttsCredits } from "@/lib/zunoza/credit-economy";
import { sniffAudioMime } from "@/lib/zunoza/montage-upload";

export type TtsVoice = { id: string; name: string; label: string };
export type VoiceAsset = {
  id: string;
  text: string;
  voiceId: string;
  language: string;
  audioUrl: string | null;
  storedOnR2: boolean;
  mimeType: string;
  byteSize: number | null;
  createdAt: string;
};

/** Built-in xAI voices from docs.x.ai Voice API — not invented. */
const TTS_HINTS: Record<string, string> = {
  altair: "Zarif anlatım",
  ara: "Sıcak ve samimi",
  atlas: "Kendinden emin",
  aurora: "Huzurlu",
  carina: "Yumuşak ve sakin",
  castor: "Samimi",
  celeste: "Güven veren",
  cosmo: "Meraklı",
  eve: "Enerjik ve neşeli",
  helios: "Canlı asistan",
  helix: "Dinamik yorum",
  iris: "Neşeli satış",
  kepler: "Karizmatik",
  leo: "Otoriter",
  liora: "Sakin",
  lumen: "Sıcak ve net",
  luna: "Sabırlı eğitim",
  lux: "Topraklanmış anlatım",
  naksh: "Düşünceli",
  orion: "Sinematik anlatıcı",
  perseus: "Güçlü reklam",
  rex: "Net ve özgüvenli",
  rigel: "Profesyonel",
  sal: "Dengeli",
  sirius: "Oyunbaz",
  ursa: "Sıcak asistan",
  zagan: "Dramatik karakter",
  zenith: "Keskin ve odaklı",
};

const FALLBACK_VOICES: TtsVoice[] = Object.keys(TTS_HINTS).map((id) => ({
  id,
  name: id[0]!.toUpperCase() + id.slice(1),
  label: `${id[0]!.toUpperCase() + id.slice(1)} — ${TTS_HINTS[id]}`,
}));

const ALLOWED_LANGUAGES = new Set(["tr", "en"]);

function mapVoice(row: { voice_id?: string; id?: string; name?: string }): TtsVoice {
  const id = String(row.voice_id || row.id || "").toLowerCase();
  const name = row.name || id;
  const hint = TTS_HINTS[id];
  return { id, name, label: hint ? `${name} — ${hint}` : name };
}

function mapAsset(row: Record<string, unknown>): VoiceAsset {
  const id = String(row.id);
  const stored = row.audio_url ? String(row.audio_url) : null;
  return {
    id,
    text: String(row.text),
    voiceId: String(row.voice_id),
    language: String(row.language),
    audioUrl: r2ClientAudioUrl(id, stored),
    storedOnR2: Boolean(stored && stored.startsWith("r2:")),
    mimeType: String(row.mime_type ?? "audio/mpeg"),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    createdAt: String(row.created_at),
  };
}

function normalizeLanguage(value: string | undefined) {
  const lang = (value || "tr").trim().toLowerCase();
  if (lang === "auto") return "tr";
  return ALLOWED_LANGUAGES.has(lang) ? lang : "tr";
}

async function fetchVoiceCatalog(apiKey: string): Promise<TtsVoice[]> {
  try {
    const res = await fetch("https://api.x.ai/v1/tts/voices", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return FALLBACK_VOICES;
    const json = (await res.json().catch(() => ({}))) as {
      voices?: { voice_id?: string; id?: string; name?: string }[];
    };
    const rows = Array.isArray(json.voices) ? json.voices : [];
    const mapped = rows.map(mapVoice).filter((v) => /^[a-z0-9_-]{2,32}$/.test(v.id));
    return mapped.length ? mapped : FALLBACK_VOICES;
  } catch {
    return FALLBACK_VOICES;
  }
}

export const listTtsVoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) return [] as TtsVoice[];
    return fetchVoiceCatalog(apiKey);
  });

export const generateStudioAudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { text: string; voiceId: string; language?: string }) => input)
  .handler(async ({ context, data }) => {
    const text = data.text.trim().slice(0, 4000);
    if (text.length < 8) throw new Error("Seslendirilecek metni biraz daha uzun yazın.");
    assertSafeGeneration(text);
    const sqlGate = await getSql();
    await assertCanUseStudio(sqlGate, context.userId, "tts");
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Seslendirme modeli bu ortamda bağlı d
... 