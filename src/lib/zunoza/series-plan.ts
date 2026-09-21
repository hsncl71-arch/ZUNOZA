/** Client-safe episode planner. Clips stay 5/10/15s — never invent a longer Imagine duration. */

import { planVideoPrompt } from "./video-plan.ts";
import type { ProductVoiceMode, VideoQuality } from "./video-request.ts";

export const EPISODE_SECONDS = [60, 90, 120, 180, 240, 300] as const;
export type EpisodeSeconds = (typeof EPISODE_SECONDS)[number];
export const MAX_SERIES_EPISODES = 50;
export const DEFAULT_EPISODE_SECONDS: EpisodeSeconds = 300;

export const SERIES_GENRES = [
  { id: "drama", label: "Drama" },
  { id: "aksiyon", label: "Aksiyon" },
  { id: "belgesel", label: "Belgesel" },
  { id: "gerilim", label: "Gerilim" },
  { id: "komedi", label: "Komedi" },
  { id: "bilim-kurgu", label: "Bilim kurgu" },
  { id: "romantik", label: "Romantik" },
  { id: "tarih", label: "Tarih" },
] as const;

export type SeriesGenreId = (typeof SERIES_GENRES)[number]["id"];

export type SeriesCharacter = {
  id: string;
  name: string;
  look: string;
  clothing: string;
  voice: string;
};

export type SeriesLocation = {
  id: string;
  name: string;
  look: string;
};

export type SeriesBible = {
  logline: string;
  style: string;
  characters: SeriesCharacter[];
  locations: SeriesLocation[];
  events: string[];
  referenceImages: string[];
  voiceLock: string;
  identityLocked: boolean;
  lastEpisodeNumber: number;
  lastEpisodeTitle: string;
  lastSceneBeat: string;
};

export type SeriesScenePlan = {
  id: string;
  index: number;
  seconds: 5 | 10 | 15;
  title: string;
  prompt: string;
  directedPrompt: string;
  camera: string;
  lighting: string;
  dialogue: string;
  location: string;
  characters: string[];
  voiceMode: ProductVoiceMode;
  jobId: string | null;
  status: "bekliyor" | "uretiliyor" | "tamamlandi" | "basarisiz";
  videoUrl: string | null;
  errorMessage: string | null;
  retries: number;
};

const CONTINUITY_MANDATE =
  "ZORUNLU SÜREKLİLİK (1–50. bölüm): Bu çekim önceki çekimin ve önceki bölümün kesintisiz devamıdır. Dizi hafızası sıfırlanmaz. Aynı yüz, aynı sima, aynı beden oranı, aynı kıyafet, aynı ses kimliği. Yeni başrol yok, yaş/etnik/saç değişimi yok, recast yok.";

export function assertEpisodeSeconds(value: unknown): EpisodeSeconds {
  const n = Number(value);
  if ((EPISODE_SECONDS as readonly number[]).includes(n)) return n as EpisodeSeconds;
  throw new Error("Bölüm süresi 1, 1.5, 2, 3, 4 veya 5 dakika olabilir.");
}

export function assertSeriesEpisodeSlot(nextNumber: number) {
  const n = Math.trunc(Number(nextNumber) || 0);
  if (n < 1) throw new Error("Bölüm numarası geçersiz.");
  if (n > MAX_SERIES_EPISODES) {
    throw new Error("Bu sezon 50 bölümle kilitlendi. Karakter kimliği korunur; 51. bölüm için yeni dizi açın.");
  }
  return n;
}

export function episodeMinuteLabel(seconds: number) {
  if (seconds === 60) return "1 dakika";
  if (seconds === 90) return "1.5 dakika";
  if (seconds % 60 === 0) return `${seconds / 60} dakika`;
  return `${seconds} saniye`;
}

/** Pack 60–300s into official Imagine lengths only. Prefer 15s for cinematic continuity. */
export function splitEpisodeSeconds(total: number): Array<5 | 10 | 15> {
  const t = assertEpisodeSeconds(total);
  const shots: Array<5 | 10 | 15> = [];
  let left = t;
  while (left > 0) {
    if (left === 20 || left === 25) {
      shots.push(10);
      left -= 10;
      continue;
    }
    if (left >= 15) {
      shots.push(15);
      left -= 15;
      continue;
    }
    if (left >= 10) {
      shots.push(10);
      left -= 10;
      continue;
    }
    shots.push(5);
    left -= 5;
  }
  return shots;
}

export function emptyBible(): SeriesBible {
  return {
    logline: "",
    style: "",
    characters: [],
    locations: [],
    events: [],
    referenceImages: [],
    voiceLock: "",
    identityLocked: false,
    lastEpisodeNumber: 0,
    lastEpisodeTitle: "",
    lastSceneBeat: "",
  };
}

function isIdentityRef(value: unknown) {
  const text = String(value || "").trim();
  if (text.startsWith("data:image/")) return text.length > 32 && text.length <= 450_000;
  return /^https:\/\//i.te
... 