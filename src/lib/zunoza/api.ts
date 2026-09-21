import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isOwnerUser, isUnlimitedUser, requireAdmin } from "@/lib/zunoza/owner";
import { assertCanUseStudio } from "@/lib/zunoza/access";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import { logUsageEvent } from "@/lib/zunoza/usage";
import { profileAgeConfirmed, latestConsentGranted } from "@/lib/zunoza/privacy";
import { readAssistantVoice } from "@/lib/zunoza/admin";
import {
  removeOwnedStoredMedia,
  isR2ObjectRef,
  isTransientVideoUrl,
  persistRemoteVideoToR2,
  r2ClientVideoUrl,
  r2Configured,
  videoObjectKey,
} from "@/lib/zunoza/r2";
import {
  assertProductVideoDuration,
  buildXaiVideoBody,
  clampXaiAspect,
  JOB_STALE_MS,
  normalizeVoiceMode,
  xaiResolution,
  type ProductVoiceMode,
  type XaiAspect,
} from "@/lib/zunoza/video-request";
import { notifyVideoReady } from "@/lib/zunoza/native-push";
import { normalizeVideoLanguage } from "@/lib/zunoza/video-languages";
import { planVideoPrompt } from "@/lib/zunoza/video-plan";
import { logAiUsage, publicAiError, assertAiRateLimit } from "@/lib/zunoza/ai-usage";
import { parseXaiUsage, xaiLogFields } from "@/lib/zunoza/xai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateVideoUsd } from "@/lib/zunoza/provider-cost";
import { beginPersist, circuitAllow, circuitFail, circuitOk, endPersist, shouldPollProvider } from "@/lib/zunoza/resilience";
import {
  assertFreeTierAllows,
  assertNotDuplicate,
  beginUserJob,
  chargeCredits,
  readEconomySettings,
  readFeatureCreditMap,
  refundCredits,
  restoreUnlimitedSpend,
  userIsFreeTier,
  videoCreditsFor,
} from "@/lib/zunoza/credits";
import { WELCOME_CREDITS_DEFAULT } from "@/lib/zunoza/credit-economy";
const DEMO_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export type Quality = "ekonomik" | "standart" | "hd" | "ultra";
export type Aspect = XaiAspect;
export type VoiceMode = ProductVoiceMode | "dogal" | "tts" | "muzik";

export type VideoJob = {
  id: string;
  prompt: string;
  durationSeconds: number;
  aspect: string;
  quality: string;
  model: string;
  voiceMode: string;
  language: string;
  sourceKind: string;
  creditCost: number;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  isDemo: boolean;
  storyboardId: string | null;
  sceneIndex: number | null;
  negativePrompt: string | null;
  createdAt: string;
};

export type StoryboardBoard = {
  id: string;
  title: string;
  scenes: VideoJob[];
  totalSeconds: number;
  completedSeconds: number;
  readyForMontage: boolean;
  allComplete: boolean;
  hasFailure: boolean;
};

type CreateInput = {
  prompt: string;
  durationSeconds: 5 | 10 | 15;
  aspect: Aspect;
  quality: Quality;
  model: string;
  voiceMode: VoiceMode;
  language: string;
  sourceKind: string;
  negativePrompt?: string;
  voiceInstruction?: string;
  imageDataUrl?: string;
  referenceImages?: string[];
  lastFrameDataUrl?: string;
  storyboardId?: string;
  sceneIndex?: number;
  continueFrom?: string;
};

function mapJob(row: Record<string, unknown>): VideoJob {
  const id = String(row.id);
  const stored = row.video_url ? String(row.video_url) : null;
  return {
    id,
    prompt: String(row.prompt),
    durationSeconds: Number(row.duration_seconds),
    aspect: String(row.aspect),
    quality: String(row.quality),
    model: String(row.model),
    voiceMode: String(row.voice_mode),
    language: String(row.language),
    sourceKind: String(row.source_kind),
    creditCost: Number(row.credit_cost),
    status: String(row.status),
    videoUrl: r2ClientVideoUrl(id, stored),
    errorMessage: row.error_message ? String(row.error_message) : null,
    isDemo: Boolean(row.is_demo),
    storyboardId: row.storyboard_id ? String(row.storyboard_id) : null,
    sceneIndex: row.scene_index == null ? null : Number(row.scene_index),
    negativePrompt: row.negative_prompt ? String(row.negative_prompt) : null,
    createdAt: String(row.created_at),
  };
}

export function jobStatusLabel(status: string) {
  switch (status) {
    case "hazirlaniyor":
      return "İstek alındı";
    case "modele_gonderildi":
      return "Modele gönderildi";
    case "olusturuluyor":
      return "Video üretiliyor";
    case "tamamlandi":
      return "Tamamlandı";
    case "basarisiz":
      return "Başarısız";
    default:
      return status;
  }
}

export async function ensureProfile(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  email?: string | null,
  name?: string | null,
) {
  const [authUser] = email
    ? [{ email }]
    : await sql<{ email: string | null }>`select email from "user" where id = ${userId}`;
  const [existing] = await sql<{ email: string | null }>`
    select email from zunoza_profiles where user_id = ${userId}
  `;
  const resolvedEmail = email ?? authUser?.email ?? existing?.email ?? null;
  const owner = await isOwnerUser(sql, userId);

  await sql`
    insert into zunoza_profiles (user_id, display_name, email, is_admin, welcome_pending)
    values (${userId}, ${name ?? null}, ${resolvedEmail}, ${owner}, ${true})
    on conflict (user_id) do update
      set display_name = coalesce(zunoza_profiles.display_name, excluded.display_name),
          email = coalesce(excluded.email, zunoza_profiles.email),
          is_admin = zunoza_profiles.is_admin or ${owner}
  `;
  await sql`
    insert into credit_wallets (user_id, balance) values (${userId}, 0)
    on conflict (user_id) do nothing
  `;
  const welcomeId = crypto.randomUUID();
  const granted = await sql.query<{ id: string }>(
    `insert into credit_ledger (id, user_id, amount, kind, note)
     values ($1, $2, $3, 'hosgeldin', $4)
     on conflict (user_id) where (kind = 'hosgeldin') do nothing
     returning id`,
    [welcomeId, us
... 