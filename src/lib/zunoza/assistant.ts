import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { applyMemoryUtterance, looksLikeMemoryCommand, memoriesForPrompt, isAbusiveOrTransient, isIdentityCorrection } from "@/lib/zunoza/memory";
import { brandInstantReply, founderProfileSystem, type FounderProfile, DEFAULT_FOUNDER_PROFILE } from "@/lib/zunoza/brand";
import { ASK_PERSONA_CHAT } from "@/lib/zunoza/ask-persona";
import { askLanguageInstruction, askReplyLanguageFromHistory, askStatusLine, clockLocale, detectMessageLanguage, ttsLanguageCode } from "@/lib/zunoza/ask-lang";
import { wantsWebSearch as intentWantsWebSearch, isClockQuestion, skipWebForAttachedImage } from "@/lib/zunoza/web-search-intent";
import { hushRantReply } from "@/lib/zunoza/client-error";
import { logAiUsage, publicAiError } from "@/lib/zunoza/ai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateChatUsd, estimateTtsUsd } from "@/lib/zunoza/provider-cost";
import { assertNotDuplicate, chargeCredits, refundCredits, readFeatureCreditMap } from "@/lib/zunoza/credits";
import { routeAiIntent, specialistPath } from "@/lib/zunoza/ai-route";
import { circuitAllow, circuitFail, circuitOk } from "@/lib/zunoza/resilience";
import { readFounderProfile } from "@/lib/zunoza/admin";

export type StudioAction =
  | "video"
  | "image"
  | "voice"
  | "storyboard"
  | "montage"
  | "cover"
  | "script"
  | "social"
  | "builder"
  | "none";

export const ASSISTANT_WELCOME =
  "Merhaba, ben ZUNOZA. Yapay zekâ asistanınızım. Size nasıl yardımcı olabilirim?";

export type ChatMessage = { role: "user" | "assistant"; content: string; images?: string[] };

export type AssistantReply = {
  reply: string;
  action: StudioAction;
  prompt: string;
  durationSeconds: 5 | 10 | 15 | null;
  path: string | null;
};

const ACTION_PATH: Record<StudioAction, string | null> = {
  video: "/olustur",
  image: "/gorsel",
  voice: "/seslendirme",
  storyboard: "/storyboard",
  montage: "/montaj",
  cover: "/kapak",
  script: "/senaryo",
  social: "/sosyal",
  builder: "/insa-et",
  none: null,
};

const CHAT_MODELS = ["grok-4-fast-non-reasoning", "grok-3-mini", "grok-4"] as const;
const HISTORY_LIMIT = 10;
const USER_CHARS = 1400;
const ASSISTANT_CHARS = 900;
const HISTORY_BUDGET = 6400;

const globalChat = globalThis as typeof globalThis & { __zunozaChatModel__?: string };

function parseAction(raw: string): {
  reply: string;
  action: StudioAction;
  prompt: string;
  durationSeconds: 5 | 10 | 15 | null;
} {
  let action: StudioAction = "none";
  let prompt = "";
  let durationSeconds: 5 | 10 | 15 | null = null;
  let reply = raw.trim();
  const marker = reply.match(/\[\[aksiyon:([a-z|]+)(?::(\d+))?(?::([\s\S]*))?\]\]\s*$/i);
  if (marker) {
    reply = reply.slice(0, marker.index).trim();
    const kind = (marker[1] || "none").toLowerCase();
    if (kind in ACTION_PATH) action = kind as StudioAction;
    const dur = Number(marker[2] || 0);
    if (dur === 5 || dur === 10 || dur === 15) durationSeconds = dur;
    else if (dur === 30) durationSeconds = 15;
    prompt = (marker[3] || "").trim();
  }
  if (!prompt) prompt = reply.slice(0, 500);
  return { reply, action, prompt, durationSeconds };
}

async function completeChat(
  apiKey: string,
  messages: AskApiTurn[],
  hasVision = false,
) {
  circuitAllow("xai");
  const unique = chatModels(hasVision);
  let last = "Yazılı asistan bu ortamda yanıt veremedi.";
  for (const model of unique) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.55,
          max_tokens: hasVision ? 900 : 720,
          messages,
        }),
        signal: AbortSignal.timeout(hasVision ? 40_000 : 18_000),
      });
      const json = (await res.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
        message?: string;
      };
      if (res.status === 404 || res.status === 400) {
        last = publicAiError(json.error?.message || json.message || last);
        continue;
      }
      if (res.status === 429) throw new Error("Asistan kotası doldu. Lütfen biraz bekleyin.");
      if (!res.ok) throw new Error(publicAiError(json.error?.mess
... 