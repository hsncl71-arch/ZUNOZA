/**
 * Owner cost audit from code catalogs — not a live provider invoice.
 * Video seconds: 5 / 10 / 15 only. 30s is not a product SKU.
 */

import {
  ELEVEN_MUSIC_USD_PER_MIN,
  IMAGE_OUTPUT_USD,
  PRICE_AS_OF,
  SHOTSTACK_USD_PER_MIN,
  USD_TRY_SNAPSHOT,
  VIDEO_INPUT_IMAGE_USD,
  VIDEO_USD_PER_SEC,
  WEB_SEARCH_USD_PER_CALL,
  XAI_TTS_USD_PER_MILLION_CHARS,
  XAI_VOICE_USD_PER_MIN,
  estimateChatUsd,
  estimateVideoUsd,
  qualityToResolution,
} from "./provider-cost.ts";
import {
  COVERED_TRY_PER_CREDIT,
  DEFAULT_FEATURE_CREDITS,
  DEFAULT_PACKAGES,
  DEFAULT_VIDEO_CREDIT_TABLE,
  IYZICO_ASSUMPTION_LABEL,
  IYZICO_ASSUMPTION_PCT,
  KDV_RATE,
  STORAGE_USD_PER_VIDEO,
  iyzicoAmountTry,
  usableCollectionTry,
  vatAmountTry,
  type Quality,
} from "./credit-economy.ts";

export const COST_PRICE_AS_OF = PRICE_AS_OF;
export const COST_FX_SNAPSHOT = USD_TRY_SNAPSHOT;
export const VIDEO_MODEL = "grok-imagine-video-1.5";
export const VIDEO_PROVIDER = "xAI";

export type ServiceStatus = "aktif" | "hazir-pasif" | "opsiyonel" | "kullanilmiyor";

export const PAID_SERVICES = [
  {
    id: "xai-video",
    payee: "xAI",
    forWhat: "Metinden/görselden video grok-imagine-video-1.5",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "kullandıkça / saniye",
    source: `xAI model docs ${PRICE_AS_OF}`,
  },
  {
    id: "xai-image",
    payee: "xAI",
    forWhat: "Görsel üret/düzenle grok-imagine-image-2.0",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "kullandıkça / görsel",
    source: `kod kataloğu ${PRICE_AS_OF}`,
  },
  {
    id: "xai-chat",
    payee: "xAI",
    forWhat: "ZUNOZA’ya Sor, şarkı sözü, İnşa Et (grok-4-fast-non-reasoning / grok-3-mini / grok-4)",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "tahmini token — resmi tabloda bu modeller yok",
    source: "tahmin: $0.20 in / $0.50 out / 1M token",
  },
  {
    id: "xai-tts",
    payee: "xAI",
    forWhat: "TTS / seslendir",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "kullandıkça / karakter",
    source: `kod ${XAI_TTS_USD_PER_MILLION_CHARS}$/1M karakter`,
  },
  {
    id: "xai-stt",
    payee: "xAI",
    forWhat: "STT / medya yazıya",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "bilinmiyor — resmi satır kodda yok",
    source: "bilinmiyor",
  },
  {
    id: "xai-voice",
    payee: "xAI",
    forWhat: "Canlı ses grok-voice-latest",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "kullandıkça / dakika",
    source: `kod ${XAI_VOICE_USD_PER_MIN}$/dk`,
  },
  {
    id: "xai-search",
    payee: "xAI",
    forWhat: "Asistan web araması",
    env: ["XAI_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "çağrı",
    source: `kod ${WEB_SEARCH_USD_PER_CALL}$/çağrı`,
  },
  {
    id: "eleven-music",
    payee: "ElevenLabs",
    forWhat: "AI müzik",
    env: ["ELEVENLABS_API_KEY", "ELEVEN_API_KEY"],
    status: "aktif" as ServiceStatus,
    billing: "kullandıkça / dakika",
    source: `ElevenLabs Music API ${ELEVEN_MUSIC_USD_PER_MIN}$/dk`,
  },
  {
    id: "shotstack",
    payee: "Shotstack",
    forWhat: "Montaj render",
    env: ["SHOTSTACK_API_KEY"],
    status: "opsiyonel" as ServiceStatus,
    billing: "kullandıkça / dakika",
    source: `Shotstack PAYG ${SHOTSTACK_USD_PER_MIN}$/dk`,
  },
  {
    id: "r2",
    payee: "Cloudflare R2",
    forWhat: "Video/görsel/ses depolama",
    env: ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET", "R2_ACCOUNT_ID"],
    status: "aktif" as ServiceStatus,
    billing: "depolama + çıkış — canlı fatura yok",
    source: `kod overlay ${STORAGE_USD_PER_VIDEO}$/video (fatura değil)`,
  },
  {
    id: "neon",
    payee: "Postgres (DATABASE_URL)",
    forWhat: "Hesap, kredi, job, hafıza",
    env: ["DATABASE_URL"],
    status: "aktif" as ServiceStatus,
    billing: "aylık plan — fatura repo’da yok",
    source: "bilinmiyor",
  },
  {
    id: "iyzico",
    payee: "iyzico",
  
... 