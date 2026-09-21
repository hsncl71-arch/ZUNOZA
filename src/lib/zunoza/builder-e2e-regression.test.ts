import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { evaluateBuilderOutput, mergeBuilderFiles, parseFilesPayload } from "./builder-files.ts";
import { extractHtml } from "./builder-sanitize.ts";
import { isCannedBuilderStage, mergeBuilderStream } from "./builder-stream.ts";
import { applyUserScrollIntent, shouldAutoFollowFlow } from "./builder-scroll.ts";
import { enqueueBuilderTask, completeActiveBuilderTask, queuedCountForCap } from "./builder-queue.ts";
import { inspectExistingApp } from "./builder-loop.ts";
import { runFinalQualityGate } from "./builder-gate.ts";
import { looksLikeRawMarkup, buildPreviewDocument } from "./builder-quality.ts";

const PROMPT =
  "Premium bir SaaS yönetim uygulaması oluştur. Premium giriş ve kayıt ekranı, sidebar, dashboard, istatistik kartları, tablo, arama, profil, ayarlar, mobil menü ve çalışan sayfa geçişleri olsun. Türkçe arayüz.";

const SYSTEM = `Sen ZUNOZA İnşa Et kod ajanısın. Çıktı SADECE JSON:
{"files":{"index.html":"...","styles.css":"...","app.js":"...","data.json":"..."},"changed":["..."],"summary":"kısa Türkçe"}
Kurallar:
- Çok dosyalı üret. Harici CDN yok.
- Ekranlar: giriş, kayıt, panel, kayıtlar tablosu, profil, ayarlar.
- Sidebar, istatistik kartları, arama kutusu, tablo, mobil menü (menu-btn).
- fetch/WebSocket/eval/Function yok. Formlarda preventDefault. Bellek içi veri.
- Mobil, viewport, overflow-x:hidden, 44px dokunma, Türkçe.
- JSON dışında yazma.`;

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
        temperature: 0.35,
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
  if (parsed) return parsed.files;
  return { "index.html": extractHtml(raw) };
}

function assertSaasShape(html: string, css: string, js: string) {
  assert.match(html, /type=["']password["']|Giriş|Kayıt/i);
  assert.match(html, /app-side|sidebar|data-go=|nav-item|data-page=/i);
  assert.match(html, /stat|istatistik|dashboard|panel/i);
  assert.match(html, /<table|data-table/i);
  assert.match(html, /data-search|search-input|placeholder=["'][^"']*ara/i);
  assert.match(html, /profil/i);
  assert.match(html, /ayar/i);
  assert.match(html, /menu-btn|aria-label=["']Menü["']/i);
  assert.match(js, /hashchange|data-go|addEventListener|data-page|getElementById/);
  assert.match(css, /overflow-x:\s*hidden|font-family/i);
  assert.match(css, /font-family/i);
}

test("ZUNOZA İnşa Et SaaS uçtan uca regression", { timeout: 240_000 }, async () => {
  const work = readFileSync(new URL("../../routes/insa-et_.$projectId.tsx", import.meta.url), "utf8");
  const builder = readFileSync(new URL("./builder.ts", import.meta.url), "utf8");
  const cssUi = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

  let files = evaluateBuilderOutput({}, PROMPT, { kind: "panel", name: "Atölye Paneli" }).files;
  let live = false;
  try {
    const raw = await xai(SYSTEM, PROMPT);
    if (raw) {
      live = true;
      files = mergeBuilderFiles(files, toFiles(raw));
    }
  }
... 