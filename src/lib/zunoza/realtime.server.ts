import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

const REALTIME_MODEL = "grok-voice-latest";
const WS_URL = `wss://api.x.ai/v1/realtime?model=${REALTIME_MODEL}`;

export const createVoiceLiveSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Canlı ses bu ortamda bağlı değil.");
    const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
        model: REALTIME_MODEL,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      value?: string;
      expires_at?: number;
      error?: { message?: string };
      message?: string;
    };
    if (!res.ok || !json.value) {
      throw new Error(json.error?.message || json.message || "Canlı ses oturumu açılamadı.");
    }
    return {
      clientSecret: json.value,
      expiresAt: json.expires_at ?? Math.floor(Date.now() / 1000) + 600,
      wsUrl: WS_URL,
      model: REALTIME_MODEL,
    };
  });
