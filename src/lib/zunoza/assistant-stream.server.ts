import {
  chatModels,
  chatSystemPrompt,
  formatDeviceClock,
  instantAssistantReply,
  parseAssistantOutput,
  prepareChatHistory,
  recentAskContext,
  rememberChatModel,
  shouldSearchWeb,
  webSearchAnswer,
  hushRantReply,
  visibleStreamText,
  lastUserHasImages,
  type AssistantReply,
  type ChatMessage,
} from "@/lib/zunoza/assistant";
import { getSql } from "@/lib/db";
import { readFounderProfile } from "@/lib/zunoza/admin";
import { DEFAULT_FOUNDER_PROFILE } from "@/lib/zunoza/brand";
import { applyMemoryUtterance, looksLikeMemoryCommand, memoriesForPrompt, isAbusiveOrTransient, isIdentityCorrection } from "@/lib/zunoza/memory";
import { assertAiRateLimit, logAiUsage, publicAiError } from "@/lib/zunoza/ai-usage";
import { parseXaiUsage, mergeXaiUsage, emptyXaiUsage, xaiLogFields, type XaiUsage } from "@/lib/zunoza/xai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateChatUsd } from "@/lib/zunoza/provider-cost";
import { circuitAllow, circuitFail, circuitOk } from "@/lib/zunoza/resilience";
import { assertNotDuplicate, chargeCredits, refundCredits, readFeatureCreditMap } from "@/lib/zunoza/credits";

type StreamEvent =
  | { t: "delta"; c: string }
  | { t: "done"; reply: AssistantReply }
  | { t: "error"; message: string };

const te = new TextEncoder();

function encode(event: StreamEvent) {
  return te.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sseComment(text: string) {
  return te.encode(`: ${text}\n\n`);
}

type ChatTurn = {
  role: string;
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

function toApiTurns(
  messages: Array<{ role: string; content: string; images?: string[] }>,
  stripImages = false,
): ChatTurn[] {
  return messages.map((m) => {
    if (!stripImages && m.role === "user" && m.images?.length) {
      return {
        role: m.role,
        content: [
          { type: "text" as const, text: m.content },
          ...m.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ],
      };
    }
    const extra = !stripImages || !m.images?.length ? "" : " [görsel eklendi]";
    return { role: m.role, content: `${m.content}${extra}` };
  });
}

async function* streamModel(apiKey: string, messages: ChatTurn[]) {
  circuitAllow("xai");
  let last = "Yazılı asistan bu ortamda yanıt veremedi.";
  for (const model of chatModels()) {
    let res: Response;
    try {
      res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.55,
          max_tokens: 720,
          stream: true,
          messages,
        }),
        signal: AbortSignal.timeout(24_000),
      });
    } catch (err) {
      circuitFail("xai", err);
      last = err instanceof Error ? err.message : last;
      continue;
    }
    if (res.status === 404 || res.status === 400) {
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; message?: string };
      last = json.error?.message || json.message || last;
      if (res.status === 400 && messages.some((m) => Array.isArray(m.content))) {
        messages = toApiTurns(
          messages.map((m) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : m.content.find((p) => p.type === "text")?.text || "",
            images: typeof m.content === "string" ? undefined : undefined,
          })),
          true,
        );
      }
      continue;
    }
    if (res.status === 429) throw new Error("Asistan kotası doldu. Lütfen biraz bekleyin.");
    if (!res.ok || !res.body) {
      circuitFail("xai", new Error(String(res.status)));
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; message?: string };
      throw new Error(json.error?.message || json.message || `Asistan yanıt veremedi (${res.status}).`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += de
... 