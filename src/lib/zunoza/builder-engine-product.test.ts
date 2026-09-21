import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import test from "node:test";
import { chromium } from "playwright";
import { applyIncrementalFiles, evaluateBuilderOutput, mergeBuilderFiles } from "./builder-files.ts";
import { buildKindApp } from "./builder-blueprints.ts";
import { ensureAppQuality, buildPreviewDocument, looksLikeRawMarkup } from "./builder-quality.ts";
import { inspectExistingApp } from "./builder-loop.ts";
import { looksLikeUndo } from "./builder-sanitize.ts";
import { pagesFromPrompt, completeBuilderPlan } from "./builder-architecture.ts";

const CASES = [
  {
    name: "e-ticaret",
    prompt:
      "Premium bir e-ticaret uygulaması oluştur. Ana sayfa, kategoriler, ürün listesi, ürün detay sayfası, favoriler, sepet, giriş/kayıt, profil ve iletişim sayfası olsun.",
    plan: { kind: "e-ticaret", name: "Atölye Dükkan" },
    pages: ["vitrin", "kategoriler", "urunler", "urun", "favoriler", "sepet", "giris", "hesap", "iletisim"],
  },
  {
    name: "restoran",
    prompt: "Lüks bir restoran sitesi oluştur. Menü, rezervasyon ve iletişim olsun.",
    plan: { kind: "rezervasyon", name: "Lokanta" },
    pages: ["ana", "menu", "rezerv", "hakkinda", "iletisim"],
  },
  {
    name: "saas",
    prompt: "SaaS dashboard yönetim paneli oluştur. Giriş, kayıtlar, profil ve ayarlar olsun.",
    plan: { kind: "panel", name: "Yönetim" },
    pages: ["panel", "tablo", "profil", "ayarlar"],
  },
  {
    name: "portfoy",
    prompt: "Kişisel portföy sitesi hazırla. Projeler, hakkımda ve iletişim bölümleri olsun.",
    plan: { kind: "içerik", name: "Portföy" },
    pages: ["yazilar", "hakkinda", "iletisim"],
  },
  {
    name: "rezervasyon",
    prompt: "Basit bir rezervasyon uygulaması yap. Takvim, müşteri kaydı ve onay mesajı olsun.",
    plan: { kind: "rezervasyon", name: "Randevu" },
    pages: ["ana", "rezerv", "iletisim"],
  },
] as const;

test("prompt requested pages are parsed and kept in the plan", () => {
  const pages = pagesFromPrompt(CASES[0].prompt);
  assert.ok(pages.includes("Kategoriler"));
  assert.ok(pages.includes("Ürün"));
  assert.ok(pages.includes("Favoriler"));
  assert.ok(pages.includes("Sepet"));
  const plan = completeBuilderPlan(CASES[0].prompt, { kind: "e-ticaret" });
  assert.ok(plan.pages?.some((p) => /kategor/i.test(p)));
  assert.ok(plan.pages?.some((p) => /sepet/i.test(p)));
});

test("keep-files are dropped on incremental merge", () => {
  const current = buildKindApp("e-ticaret", "Dükkan", "organik gıda mağazası");
  const inspect = inspectExistingApp(current, "mobil görünümü düzelt", { kind: "e-ticaret" });
  assert.equal(inspect.incremental, true);
  assert.ok(inspect.keep.includes("app.js"));
  const merged = applyIncrementalFiles(current, { "app.js": "function broken(", "styles.css": current["styles.css"] + "\nbody{padding:8px}" }, inspect.keep);
  assert.equal(merged["app.js"], current["app.js"]);
  assert.match(merged["styles.css"] || "", /padding:8px/);
});

test("substantial edit does not get replaced by a different kind floor", () => {
  const shop = buildKindApp("e-ticaret", "Dükkan", "mağaza sepet");
  const unique = (shop["index.html"] || "").replace("Dükkan", "ÖZEL-MARKA");
  const next = ensureAppQuality(
    { ...shop, "index.html": unique },
    "renkleri biraz aç",
    { kind: "e-ticaret", name: "Dükkan" },
    { preserve: true, previous: shop },
  );
  assert.match(next["index.html"] || "", /ÖZEL-MARKA|Dükkan|sepet/);
  assert.doesNotMatch(next["index.html"] || "", /data-page="panel"/);
});

test("undo phrases cover natural Turkish follow-ups", () => {
  assert.equal(looksLikeUndo("Bunu beğenmedim, geri al"), true);
  assert.equal(looksLikeUndo("Son yaptığını geri al"), true);
  assert.equal(looksLikeUndo("Her şeyi değiştir"), false);
});

for (const item of CASES) {
  test(`${item.name} floor has requested pages and honest limits`, () => {
    const created = evaluateBuilderOutput({}, item.prompt, item.plan);
    assert.equal(created.ok, true, created.issues.join("; ") || `${i
... 