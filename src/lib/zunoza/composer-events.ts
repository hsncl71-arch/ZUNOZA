export const LIVE_START_KEY = "zunoza.liveStart";
export const ASK_EVENT = "zunoza:ask";
export const LIVE_START_EVENT = "zunoza:live-start";
export const PENDING_ASK_KEY = "zunoza.pendingAsk";

export type ComposerAskDetail = {
  text: string;
  images?: string[];
};

export function buildAskContent(text: string, videoNames: string[]) {
  const notes = videoNames.map((name) => (name.includes("Video eklendi") ? name : `Video eklendi: ${name}`));
  const body = [text.trim(), ...notes].filter(Boolean).join("\n");
  return body || (videoNames.length ? "Eklediğim dosyaya bak." : "");
}

export function requestLiveStart(alreadyOnAssistant: boolean) {
  try {
    sessionStorage.setItem(LIVE_START_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(LIVE_START_EVENT));
  return alreadyOnAssistant;
}

export function consumeLiveStartFlag() {
  try {
    if (sessionStorage.getItem(LIVE_START_KEY) !== "1") return false;
    sessionStorage.removeItem(LIVE_START_KEY);
    return true;
  } catch {
    return false;
  }
}

export function stashPendingAsk(detail: ComposerAskDetail) {
  const payload = {
    text: String(detail.text || "").slice(0, 4000),
    images: Array.isArray(detail.images) ? detail.images.slice(0, 8) : undefined,
  };
  try {
    sessionStorage.setItem(PENDING_ASK_KEY, JSON.stringify(payload));
    return true;
  } catch {
    try {
      sessionStorage.setItem(
        PENDING_ASK_KEY,
        JSON.stringify({ text: payload.text, images: payload.images?.slice(0, 1) }),
      );
      return true;
    } catch {
      return false;
    }
  }
}

export function consumePendingAsk(): ComposerAskDetail | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ASK_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ASK_KEY);
    const parsed = JSON.parse(raw) as ComposerAskDetail;
    if (!parsed || typeof parsed !== "object") return null;
    const text = typeof parsed.text === "string" ? parsed.text : "";
    const images = Array.isArray(parsed.images)
      ? parsed.images.filter((url): url is string => typeof url === "string" && url.startsWith("data:image/"))
      : undefined;
    if (!text && !images?.length) return null;
    return { text, images };
  } catch {
    return null;
  }
}
