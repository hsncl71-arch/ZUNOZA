// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isUnlimitedUser } from "@/lib/zunoza/owner";
import { getR2Object, isR2ObjectRef, persistBytesToR2, r2ObjectKey, deleteStoredMedia } from "@/lib/zunoza/r2";
import { fetchAllowedHttps } from "@/lib/zunoza/safe-fetch";
import { DEFAULT_FEATURE_CREDITS } from "@/lib/zunoza/credit-economy";
import { estimateChatUsd, estimateProviderUsd } from "@/lib/zunoza/provider-cost";
import { logAiUsage, assertAiRateLimit } from "@/lib/zunoza/ai-usage";
import { writeCostLedger } from "@/lib/zunoza/cost-ledger";
import { circuitAllow, circuitOk, circuitFail } from "@/lib/zunoza/resilience";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { chargeCredits, readFeatureCreditMap, assertNotDuplicate, refundByJob } from "@/lib/zunoza/credits";
import { logUsageEvent } from "@/lib/zunoza/usage";
import { parseImageDataUrl } from "@/lib/zunoza/image-request";
import { assertSafeGeneration } from "@/lib/zunoza/content-safety";
import { BUILDER_KICK_STEPS, BUILDER_QUEUE_MAX, jobExceededCaps, jobExceededDeadline, publicBuilderFailMessage, type BuilderStatus } from "@/lib/zunoza/builder-agent";
import { looksLikeUndo, looksLikeRedo, parsePlanJson, sanitizeBuilderHtml, suggestProjectName, extractHtml } from "@/lib/zunoza/builder-sanitize";
import {
  appendBuilderLog,
  bundleBuilderFiles,
  deserializeFiles,
  evaluateBuilderOutput,
  filesFromLegacyHtml,
  isAllowedBuilderPath,
  makeBuilderReport,
  applyIncrementalFiles,
  normalizeBuilderReport,
  parseFilesPayload,
  repairBuilderFiles,
  serializeFiles,
  type BuilderFileMap,
  type BuilderJobReport,
} from "@/lib/zunoza/builder-files";
import { completeBuilderPlan, describeDependencyCheck, describeGeneratedWork } from "@/lib/zunoza/builder-architecture";
import { dumpFilesForAgent, inspectExistingApp, mergeInspectIntoPlan, needsUserClarification } from "@/lib/zunoza/builder-loop";
import { formatSelectedEdit } from "@/lib/zunoza/builder-select";
import { buildPreviewDocument, ensureAppQuality } from "@/lib/zunoza/builder-quality";
import { BUILDER_TASK_ACTIVE, BUILDER_TASK_COMPLETED, BUILDER_TASK_FAILED, BUILDER_TASK_QUEUED, canMutateQueuedTask } from "@/lib/zunoza/builder-queue";