/** Hard cost ceiling for series episodes. Planned 1–5 min still splits into 5/10/15s Imagine clips. */

import { xaiResolution, type VideoQuality } from "./video-request.ts";
import { MAX_SERIES_EPISODES } from "./series-plan.ts";

export const SERIES_COST_LIMITS = {
  maxPlannedSeconds: 300,
  generatedMultiplier: 1.5,
  maxGeneratedSecondsPerEpisode: 450,
  maxRegenerationsPerEpisode: 8,
  maxRegenerationsPerScene: 2,
  maxResolution: "720p" as const,
  maxSeasonGeneratedSeconds: MAX_SERIES_EPISODES * 450,
} as const;

export type SeriesResolution = "480p" | "720p" | "1080p";

export type SeriesBudget = {
  plannedSeconds: number;
  generatedSeconds: number;
  regenerations: number;
  resolution: SeriesResolution;
  retriesByScene: Record<string, number>;
  stopped: boolean;
  stoppedReason: string | null;
};

export function seriesResolutionFor(quality?: string, hasRefs = true): SeriesResolution {
  const q = (quality || "hd") as VideoQuality;
  const wanted = xaiResolution(q === "ekonomik" || q === "standart" || q === "hd" || q === "ultra" ? q : "hd", hasRefs ? "r2v" : "t2v");
  if (wanted === "1080p") return SERIES_COST_LIMITS.maxResolution;
  return wanted;
}

export function maxGeneratedSecondsFor(plannedSeconds: number) {
  const planned = Math.max(0, Math.trunc(plannedSeconds) || 0);
  const scaled = Math.ceil((planned * SERIES_COST_LIMITS.generatedMultiplier) / 15) * 15;
  return Math.min(SERIES_COST_LIMITS.maxGeneratedSecondsPerEpisode, Math.max(planned, scaled));
}

export function emptySeriesBudget(opts: { plannedSeconds: number; quality?: string; hasRefs?: boolean }): SeriesBudget {
  const planned = Math.max(0, Math.trunc(opts.plannedSeconds) || 0);
  return {
    plannedSeconds: planned,
    generatedSeconds: 0,
    regenerations: 0,
    resolution: seriesResolutionFor(opts.quality, opts.hasRefs !== false),
    retriesByScene: {},
    stopped: false,
    stoppedReason: null,
  };
}

export function parseSeriesBudget(raw: unknown, fallback: { plannedSeconds: number; quality?: string; hasRefs?: boolean }): SeriesBudget {
  const base = emptySeriesBudget(fallback);
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;
  const retries: Record<string, number> = {};
  if (row.retriesByScene && typeof row.retriesByScene === "object") {
    for (const [key, value] of Object.entries(row.retriesByScene as Record<string, unknown>)) {
      const n = Math.trunc(Number(value) || 0);
      if (n > 0) retries[key.slice(0, 80)] = n;
    }
  }
  const resolution = row.resolution === "480p" || row.resolution === "720p" || row.resolution === "1080p" ? row.resolution : base.resolution;
  return {
    plannedSeconds: Number.isFinite(Number(row.plannedSeconds)) ? Math.max(0, Math.trunc(Number(row.plannedSeconds))) : base.plannedSeconds,
    generatedSeconds: Math.max(0, Math.trunc(Number(row.generatedSeconds) || 0)),
    regenerations: Math.max(0, Math.trunc(Number(row.regenerations) || 0)),
    resolution: resolution === "1080p" ? SERIES_COST_LIMITS.maxResolution : resolution,
    retriesByScene: retries,
    stopped: Boolean(row.stopped),
    stoppedReason: row.stoppedReason ? String(row.stoppedReason).slice(0, 280) : null,
  };
}

export type SeriesBudgetAdd = {
  seconds?: number;
  regeneration?: boolean;
  sceneId?: string;
  seasonGeneratedSeconds?: number;
};

export type SeriesBudgetDecision = {
  ok: boolean;
  budget: SeriesBudget;
  message: string | null;
};

export function applySeriesBudget(budget: SeriesBudget, add: SeriesBudgetAdd): SeriesBudgetDecision {
  const next: SeriesBudget = {
    ...budget,
    retriesByScene: { ...budget.retriesByScene },
  };
  const addSeconds = Math.max(0, Math.trunc(add.seconds || 0));
  const cap = maxGeneratedSecondsFor(next.plannedSeconds);
  if (add.regeneration) {
    const sceneId = add.sceneId || "_";
    const sceneCount = next.retriesByScene[sceneId] || 0;
    if (sceneCount >= SERIES_COST_LIMITS.maxRegenerationsPerScene) {
      next.stopped = true;
      next.stoppedReason = `Bu sahne en fazla ${SERIES_COST_LIMITS.maxRege
... 