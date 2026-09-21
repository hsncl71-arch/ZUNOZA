import { getBearerToken } from "@/lib/auth/client";
import {
  clientClock,
  instantAssistantReply,
  parseAssistantOutput,
  prepareChatHistory,
  visibleStreamText,
  type AssistantReply,
  type ChatMessage,
} from "@/lib/zunoza/assistant";
import { friendlyClientError } from "@/lib/zunoza/client-error";

export { friendlyClientError };

async function fetchAsk(
  headers: Record<string, string>,
  history: ChatMessage[],
  clock: { nowIso: string; timeZone: string },
  signal?: AbortSignal,
) {
  const body = JSON.stringify({
    messages: history,
    nowIso: clock.nowIso,
    timeZone: clock.timeZone,
  });
  try {
    return await fetch("/api/asistan-akisi", { method: "POST", headers, body, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    await new Promise((resolve) => setTimeout(resolve, 350));
    return await fetch("/api/asistan-akisi", { method: "POST", headers, body, signal });
  }
}

export async function streamZunozaAsk(opts: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}): Promise<AssistantReply> {
  const clock = clientClock();
  const history = prepareChatHistory(opts.messages);
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const hasImages = history.some((m) => m.role === "user" && m.images?.length);
  const instant = hasImages ? null : instantAssistantReply(lastUser, clock.nowIso, clock.timeZone);
  if (instant) {
    opts.onDelta(instant.reply);
    return instant;
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  let res: Response;
  try {
    res = await fetchAsk(headers, history, clock, opts.signal);
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    throw new Error(friendlyClientError(err));
  }
  if (res.status === 401) throw new Error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
  if (!res.ok || !res.body) throw new Error("Asistan yanıt veremedi.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let visible = "";
  let done: AssistantReply | null = null;
  while (true) {
    const { done: eof, value } = await reader.read();
    if (eof) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      let event: { t: "delta"; c: string } | { t: "done"; reply: AssistantReply } | { t: "error"; message: string };
      try {
        event = JSON.parse(payload) as typeof event;
      } catch {
        continue;
      }
      if (event.t === "error") throw new Error(event.message);
      if (event.t === "delta") {
        visible = visibleStreamText(event.c);
        opts.onDelta(visible);
      }
      if (event.t === "done") done = event.reply;
    }
  }
  if (done) {
    opts.onDelta(done.reply);
    return done;
  }
  if (visible.trim()) return parseAssistantOutput(visible);
  throw new Error("Asistan boş yanıt döndü.");
}
