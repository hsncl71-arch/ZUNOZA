import assert from "node:assert/strict";
import { extractHtml, sanitizeBuilderHtml } from "../src/lib/zunoza/builder-sanitize.ts";

const prompt =
  "Bana siyah, mor ve mavi neon detaylara sahip premium bir tesbih satış uygulaması oluştur. Ana sayfa, ürünler, hakkımızda ve iletişim olsun.";

async function main() {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) {
    console.log("XAI_SKIP: key missing");
    process.exit(2);
  }
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "grok-4-fast-non-reasoning",
      temperature: 0.4,
      max_tokens: 2200,
      messages: [
        {
          role: "system",
          content:
            "Tek dosyalık HTML üret. CSS/JS inline. fetch/eval/localStorage/cookie yok. Türkçe, siyah-mor-mavi tesbih mağazası. Yalnızca HTML.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json();
  if (!res.ok) {
    console.log("XAI_FAIL", res.status);
    process.exit(1);
  }
  const raw = json.choices?.[0]?.message?.content || "";
  const html = extractHtml(raw);
  const out = sanitizeBuilderHtml(html);
  assert.equal(out.ok, true);
  assert.match(out.html, /<html/i);
  assert.match(out.html.toLocaleLowerCase("tr-TR"), /tesbih|ürün|urun|mağaza|magaza/);
  assert.equal(out.html.includes("fetch("), false);
  console.log("BUILDER_LIVE_OK", out.html.length);
}

main().catch((err) => {
  console.log("XAI_FAIL", err instanceof Error ? err.name : "error");
  process.exit(1);
});
