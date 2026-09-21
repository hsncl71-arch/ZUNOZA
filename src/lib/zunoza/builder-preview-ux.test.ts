import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { builderPreviewUnlocked, mergeBuilderStream } from "./builder-stream.ts";

const work = readFileSync(new URL("../../routes/insa-et_.$projectId.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

test("workspace never keeps a photo well while the agent is working", () => {
  assert.doesNotMatch(work, /builder-composer-upload/);
  assert.doesNotMatch(work, />\s*Görsel\s*</);
  assert.doesNotMatch(work, /Fotoğraf Önizleme/);
  assert.match(work, /builderPreviewUnlocked/);
  assert.match(work, /if \(!ready \|\| !project\?\.html\) return null/);
  assert.match(work, /liveOpen && ready && project\?\.html/);
  assert.match(css, /\.builder-file-pick/);
  assert.match(css, /builder-composer-upload/);
});

test("playwright: phone, tablet, and desktop hide the well until work is done", async () => {
  mkdirSync("/workspace/screenshots", { recursive: true });
  const shell = (mode: "working" | "ready") => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --color-bg:#05050a; --color-surface:#0b0d18; --color-fg:#f4f2ff; --color-muted:#9aa3c7; --color-border:#23264a; --color-accent:#7b82ff; }
  html,body { margin:0; background:var(--color-bg); color:var(--color-fg); font-family: sans-serif; }
  .builder-flow-page { display:flex; flex-direction:column; height:100dvh; min-height:0; overflow:hidden; gap:.5rem; padding:.75rem; }
  .builder-flow-wrap { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
  .builder-flow { flex:1; overflow:auto; display:grid; gap:.55rem; }
  .builder-preview-card { position:relative; overflow:hidden; border-radius:1.15rem; border:1px solid var(--color-border); background:#07070f; }
  .builder-preview-card iframe { width:100%; height:22rem; border:0; background:#fff; }
  .builder-composer { flex-shrink:0; display:flex; gap:.5rem; align-items:flex-end; padding:.7rem 0 calc(.5rem + env(safe-area-inset-bottom,0px)); }
  .builder-composer textarea { flex:1; min-height:2.75rem; border-radius:1rem; border:0; padding:.8rem; background:#121428; color:var(--color-fg); }
  .builder-composer button { min-height:2.75rem; padding:0 .9rem; border:0; border-radius:999px; background:var(--color-accent); color:#fff; }
  .builder-step-line { margin:0; color:var(--color-muted); }
  .msg-user { margin:0 0 0 1.5rem; padding:.7rem .85rem; border-radius:1rem; background:#121428; }
</style></head>
<body>
  <div class="builder-flow-page">
    <header><p>Kafe rezervasyonu</p></header>
    <div class="builder-flow-wrap"><div class="builder-flow">
      <p class="msg-user">Kafe rezervasyonu uygulaması yap</p>
      <p class="builder-step-line">${mode === "working" ? "Düşünülüyor…" : "Arayüz bileşenleri bağlandı."}</p>
      ${mode === "ready" ? '<section class="builder-preview-card"><iframe title="Uygulama önizlemesi" srcdoc="<p>Hazır uygulama</p>"></iframe></section>' : ""}
    </div></div>
    <form class="builder-composer">
      <textarea placeholder="${mode === "working" ? "Çalışırken de yazabilirsiniz — sıraya alınır" : "Ne değişsin? Yazıp gönder."}"></textarea>
      <button type="button">${mode === "working" ? "Sıraya al" : "Gönder"}</button>
    </form>
  </div>
</body></html>`;

  const workingStream = mergeBuilderStream([], {
    projectId: "p1",
    messages: [{ id: "m1", role: "user", content: "Kafe rezervasyonu uygulaması yap" }],
    activity: [],
    running: true,
    html: "<html><body>yarıda</body></html>",
    version: 1,
  });
  assert.equal(workingStream.some((i) => i.kind === "preview"), false);
  assert.equal(builderPreviewUnlocked({ running: true, html: "<html></html>", version: 1 }), false);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of [
      { name: "phone", width: 390, height: 844 },
      { name: "android", width: 360, height: 800 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1280, height: 800 },
    ]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.setContent(shell("working"), { waitUntil: "domcontentloaded" });
      const workingText = await page.locator("body").innerText();
      assert.equal(/Görsel|Fotoğraf Önizleme/i.test(workingText), false, `${vp.name} working still shows Görsel`);
      assert.equal(await page.locator("iframe").count(), 0, `${vp.name} working still has iframe`);
      assert.equal(await page.locator(".builder-preview-card").count(), 0);
      await page.screenshot({ path: `/workspace/screenshots/insa-et-ux-${vp.name}-working.png`, fullPage: true });

      await page.setContent(shell("ready"), { waitUntil: "domcontentloaded" });
      const readyText = await page.locator("body").innerText();
      assert.equal(/Görsel|Fotoğraf Önizleme/i.test(readyText), false, `${vp.name} ready still shows Görsel`);
      assert.equal(await page.locator("iframe").count(), 1, `${vp.name} ready missing live iframe`);
      assert.equal(await page.locator(".builder-preview-card").count(), 1);
      await page.screenshot({ path: `/workspace/screenshots/insa-et-ux-${vp.name}-ready.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
