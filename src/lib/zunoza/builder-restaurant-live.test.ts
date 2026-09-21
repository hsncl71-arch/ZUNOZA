import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBuilderOutput, parseFilesPayload, repairBuilderFiles } from "./builder-files.ts";
import { extractHtml } from "./builder-sanitize.ts";

const PROMPT =
  "Modern, mobil uyumlu bir restoran web sitesi oluştur. Ana sayfa, menü, hakkımızda, iletişim ve rezervasyon bölümü olsun.";

const SYSTEM = `Sen ZUNOZA İnşa Et kod ajanısın. Çıktı SADECE JSON:
{"files":{"index.html":"...","styles.css":"...","app.js":"..."},"changed":["..."],"summary":"kısa Türkçe"}
Kurallar:
- Çok dosyalı üret: index.html, styles.css, app.js. Harici CDN/JS yok.
- Tek sayfada bölümler: ana sayfa, menü, hakkımızda, iletişim, rezervasyon.
- fetch, XMLHttpRequest, WebSocket, eval, Function, parent yok.
- Formlarda preventDefault. Rezervasyon bellek içi diziye eklensin.
- Mobil, viewport, Türkçe, 44px dokunma.
- JSON dışında yazma.`;

const REPAIR = `Sen ZUNOZA İnşa Et onarım ajanısın. Çıktı SADECE JSON files nesnesi.
fetch/WebSocket/eval kullanma. preventDefault ve addEventListener kullan.
Yalnızca bozuk dosyaları düzelt.`;

async function xai(system: string, user: string) {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) return null;
  const models = ["grok-4-fast-non-reasoning", "grok-3-mini", "grok-4"];
  for (const model of models) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
    max_tokens: 8000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
        signal: AbortSignal.timeout(75_000),
    });
    if (res.status === 404 || res.status === 400) continue;
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (content) return content;
  }
  throw new Error("Model boş yanıt döndü.");
}

function toFiles(raw: string) {
  const parsed = parseFilesPayload(raw);
  if (parsed) return repairBuilderFiles(parsed.files);
  return repairBuilderFiles({ "index.html": extractHtml(raw) });
}

test("live restaurant site generates a working preview", { timeout: 180_000 }, async (t) => {
  if (!process.env.XAI_API_KEY?.trim()) {
    t.skip("XAI_API_KEY yok");
    return;
  }
  const raw = await xai(SYSTEM, PROMPT);
  assert.ok(raw, "model yanıt vermeli");
  let files = toFiles(raw!);
  let evaluated = evaluateBuilderOutput(files);
  if (!evaluated.ok) {
    const dump = Object.entries(files)
      .map(([name, body]) => `FILE ${name}\n${body.slice(0, 6000)}`)
      .join("\n\n")
      .slice(0, 20000);
    const repairRaw = await xai(
      REPAIR,
      `SORUNLAR:\n${evaluated.issues.join("\n")}\n${dump}`,
    );
    files = { ...files, ...toFiles(repairRaw!) };
    evaluated = evaluateBuilderOutput(files);
  }
  assert.equal(evaluated.ok, true, evaluated.issues.join("; ") || "restoran sitesi kontrolü geçmedi");
  assert.ok(evaluated.tests.length > 0, "testler çalışmalı");
  assert.ok(evaluated.html.length > 80, "önizleme HTML oluşmalı");
  assert.match(evaluated.html.toLocaleLowerCase("tr-TR"), /menü|menu|rezerv/);
});
