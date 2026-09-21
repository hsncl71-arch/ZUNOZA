import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertAiRateLimit, publicAiError } from "@/lib/zunoza/ai-usage";

/** xAI Speech-to-Text REST. Uses the same XAI_API_KEY as chat. */
export const transcribeAskAudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dataUrl: string; filename?: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAiRateLimit(context.userId, "stt", 12);
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Ses çözümleme bu ortamda bağlı değil.");
    const raw = String(data.dataUrl || "");
    const match = raw.match(/^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new Error("Ses dosyası okunamadı.");
    const mime = match[1].split(";")[0] || "audio/mp4";
    if (!/^(audio|video)\//.test(mime)) throw new Error("Yalnızca ses/video çözümlenir.");
    const buf = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (buf.byteLength < 800 || buf.byteLength > 3_500_000) {
      throw new Error("Ses dosyası bu istek için uygun boyutta değil.");
    }
    const filename = (data.filename || "clip.mp4").replace(/[^\w.-]+/g, "_").slice(0, 80);
    const form = new FormData();
    form.set("format", "true");
    form.set("file", new Blob([buf], { type: mime }), filename);
    const res = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(45_000),
    });
    const json = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(publicAiError(json.error?.message || "Ses çözümlenemedi."));
    const text = String(json.text || "").trim();
    return { text: text.slice(0, 4000) };
  });
