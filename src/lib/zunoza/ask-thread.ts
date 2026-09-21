import type { ChatMessage } from "@/lib/zunoza/assistant";

export const ASK_THREAD_KEY = "zunoza.askThread";
export const ASK_VOICE_KEY = "zunoza.askVoiceOn";
const WELCOME = "Merhaba, ben ZUNOZA. Yapay zekâ asistanınızım. Size nasıl yardımcı olabilirim?";

export const ASK_SUGGESTIONS = [
  "Bugün dünyada neler oldu?",
  "Kısa bir video fikri ver",
  "Neleri hatırlıyorsun?",
] as const;

const MAX_STORED = 24;

export function slimAskMessages(messages: ChatMessage[], keepImageTurns = 4): ChatMessage[] {
  const rows = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && (m.content.trim() || m.images?.length))
    .slice(-MAX_STORED);
  const keepFrom = Math.max(0, rows.length - keepImageTurns);
  return rows.map((m, i) => ({
    role: m.role,
    content: m.content.slice(0, m.role === "assistant" ? 1800 : 2500),
    images:
      i >= keepFrom
        ? m.images?.filter((url) => url.startsWith("data:image/") || url.startsWith("http") || isAskAttachmentPath(url)).slice(0, 8)
        : undefined,
  }));
}

export function isAskAttachmentPath(url: string) {
  return /^\/api\/sor-ekler\/[A-Za-z0-9-]+\/indir(?:\?.*)?$/.test(url);
}

export function loadAskThread(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(ASK_THREAD_KEY);
    if (!raw) return [{ role: "assistant", content: WELCOME }];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return [{ role: "assistant", content: WELCOME }];
    }
    const rows = slimAskMessages(
      parsed.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"),
    );
    return rows.length ? rows : [{ role: "assistant", content: WELCOME }];
  } catch {
    return [{ role: "assistant", content: WELCOME }];
  }
}

export function saveAskThread(messages: ChatMessage[]) {
  const slim = slimAskMessages(messages);
  try {
    sessionStorage.setItem(ASK_THREAD_KEY, JSON.stringify(slim));
  } catch {
    try {
      sessionStorage.setItem(
        ASK_THREAD_KEY,
        JSON.stringify(slim.map((m) => ({ role: m.role, content: m.content }))),
      );
    } catch {
      /* quota */
    }
  }
}

export function clearAskThread() {
  try {
    sessionStorage.removeItem(ASK_THREAD_KEY);
  } catch {
    /* ignore */
  }
}

export function loadAskVoiceOn() {
  try {
    return sessionStorage.getItem(ASK_VOICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveAskVoiceOn(on: boolean) {
  try {
    if (on) sessionStorage.setItem(ASK_VOICE_KEY, "1");
    else sessionStorage.removeItem(ASK_VOICE_KEY);
  } catch {
    /* ignore */
  }
}

export function lastUserIndex(messages: Array<{ role: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return i;
  }
  return -1;
}

export function applyAskDelta(messages: ChatMessage[], visible: string): ChatMessage[] {
  const copy = [...messages];
  const last = copy[copy.length - 1];
  if (last?.role === "assistant") {
    copy[copy.length - 1] = { ...last, content: visible };
    return copy;
  }
  return [...copy, { role: "assistant", content: visible }];
}

export function askSendKey(text: string, images?: string[]) {
  return `${text.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR")}::${images?.length ?? 0}`;
}

export function lastDataImage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const hit = messages[i]?.images?.find((url) => url.startsWith("data:image/"));
    if (hit) return hit;
  }
  return undefined;
}

export function extractSourceUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => m[0]).slice(0, 8);
}

export type LiveThreadContext = {
  text: string;
  hasImage: boolean;
  lastImageDataUrl?: string;
  lastAttachmentId?: string;
  lastImageAnalyzed: boolean;
};

/** Compact same-conversation context for live voice. No data URLs. */
export function liveContextFromThread(messages: ChatMessage[]): LiveThreadContext {
  const welcome = WELCOME.slice(0, 24);
  const slim = mess
... 