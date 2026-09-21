import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { assertCanUseStudio } from "@/lib/zunoza/access";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import { assertAiRateLimit, logAiUsage, publicAiError } from "@/lib/zunoza/ai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateChatUsd } from "@/lib/zunoza/provider-cost";
import {
  assertFreeTierAllows,
  assertNotDuplicate,
  chargeCredits,
  readFeatureCreditMap,
  refundCredits,
  userIsFreeTier,
  videoCreditsFor,
} from "@/lib/zunoza/credits";
import { montageCredits } from "@/lib/zunoza/credit-economy";
import { ensureSeriesStoryboard, startUserVideoJob, syncOwnedVideoJob } from "@/lib/zunoza/api";
import { renderMontageProject, shotstackReady } from "@/lib/zunoza/montage";
import {
  isR2ObjectRef,
  montageObjectKey,
  persistBytesToR2,
  r2ClientMontageUrl,
  r2Configured,
  r2ObjectKey,
  getR2Object,
} from "@/lib/zunoza/r2";
import { fetchAllowedHttps } from "@/lib/zunoza/safe-fetch";
import { clampXaiAspect, type VideoQuality } from "@/lib/zunoza/video-request";
import { normalizeVideoLanguage } from "@/lib/zunoza/video-languages";
import {
  applySeriesBudget,
  emptySeriesBudget,
  maxGeneratedSecondsFor,
  parseSeriesBudget,
  seriesBudgetLabel,
  SERIES_COST_LIMITS,
  type SeriesBudget,
} from "@/lib/zunoza/series-budget";
import { XAI_VIDEO_CAPABILITIES } from "@/lib/zunoza/xai-video-capabilities";
import {
  assertEpisodeSeconds,
  assertSeriesEpisodeSlot,
  bibleLockLine,
  emptyBible,
  extractJsonObject,
  fallbackScenes,
  hydrateScenes,
  lockBibleIdentity,
  mergeBible,
  parseBible,
  parseSceneDrafts,
  sceneProgress,
  seasonMemoryLine,
  splitEpisodeSeconds,
  type SeriesBible,
  type SeriesGenreId,
  type SeriesScenePlan,
  MAX_SERIES_EPISODES,
  SERIES_GENRES,
} from "@/lib/zunoza/series-plan";

export type SeriesShow = {
  id: string;
  title: string;
  genre: string;
  language: string;
  aspect: string;
  quality: string;
  bible: SeriesBible;
  episodeCount: number;
  updatedAt: string;
};

export type SeriesEpisode = {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  prompt: string;
  durationSeconds: number;
  mode: "auto" | "pro";
  status: string;
  language: string;
  aspect: string;
  quality: string;
  script: string;
  scenes: SeriesScenePlan[];
  montageId: string | null;
  outputUrl: string | null;
  errorMessage: string | null;
  renderReady: boolean;
  progress: ReturnType<typeof sceneProgress>;
  budget: SeriesBudget;
  budgetLabel: string;
  extendAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

function genreId(value: unknown): SeriesGenreId {
  const id = String(value || "drama");
  return SERIES_GENRES.some((g) => g.id === id) ? (id as SeriesGenreId) : "drama";
}

function qualityId(value: unknown): VideoQuality {
  const q = String(value || "hd");
  if (q === "ekonomik" || q === "standart" || q === "hd" || q === "ultra") return q;
  return "hd";
}

function parseScenes(raw: unknown): SeriesScenePlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const seconds = row.seconds === 5 || row.seconds === 10 || row.seconds === 15 ? row.seconds : 15;
    const status =
      row.status === "tamamlandi" || row.status === "basarisiz" || row.status === "uretiliyor" ? row.status : "bekliyor";
    const voice = row.voiceMode === "konusma" || row.voiceMode === "sessiz" || row.voiceMode === "ozel" ? row.voiceMode : "ortam";
    return {
      id: String(row.id || crypto.randomUUID()),
      index: Number.isFinite(Number(row.index)) ? Number(row.index) : index,
      seconds,
      title: String(row.title || `Sahne ${index + 1}`).slice(0, 80),
      prompt: String(row.prompt || "").slice(0, 900),
      directedPrompt: String(row.directedPrompt || row.prompt || "").slice(0, 2000),
      camera: String(row.camera || "").slice(0, 160),
      lighting: String(row.lighting || "").slice(0, 160),
      dialogue: String(row.dialogue || "").slice(0, 280),
      location: String(row.location || "").slice(0, 80),
      characters: Array.isArray(row.characters) ? row.characters.map((c) => String(c).slice(0, 80)).slice(0, 4) : [],
      voiceMode: voice,
      jobId: row.jobId ? String(row.jobId) : null,
      status,
      videoUrl: row.videoUrl ? String(row.videoUrl) : null,
      errorMessage: row.errorMessage ? String(row.errorMessage) : null,
      retries: Math.max(0, Math.trunc(Number(row.retries) || 0)),
    };
  });
}

function mapShow(row: Record<string, unknown>, epis
... 