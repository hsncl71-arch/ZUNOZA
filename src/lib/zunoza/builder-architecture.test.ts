import assert from "node:assert/strict";
import test from "node:test";
import { completeBuilderPlan, defaultPagesForKind, describeDependencyCheck, describeGeneratedWork, inferAppKind, integrationNeeds } from "./builder-architecture.ts";

test("kind and needs stay honest about missing credentials", () => {
  assert.equal(inferAppKind("premium restoran rezervasyon uygulaması"), "rezervasyon");
  assert.equal(inferAppKind("yapılacaklar listesi görev ekle"), "todo");
  const needs = integrationNeeds("Google ile giriş ve iyzico ödeme ekle");
  assert.ok(needs.some((n) => /Google/i.test(n)));
  assert.ok(needs.some((n) => /iyzico|tahsilat/i.test(n)));
  assert.equal(integrationNeeds("yapılacaklar listesi").length, 0);
});

test("generated work lines follow produced files, never a live database", () => {
  const lines = describeGeneratedWork(
    {
      "index.html": "<html></html>",
      "styles.css": "body{}",
      "app.js": "const db=[]",
      "data.json": "[]",
    },
    "restoran rezervasyon",
  );
  assert.ok(lines.some((l) => /mimari/i.test(l)));
  assert.ok(lines.some((l) => /Dosyalar/.test(l)));
  assert.ok(lines.some((l) => /bellek içi/i.test(l)));
  assert.equal(lines.some((l) => /Neon|bağlandı|connected/i.test(l)), false);
  assert.match(describeDependencyCheck({ "app.js": "console.log(1)" }), /harici paket yok/);
  assert.match(describeDependencyCheck({ "app.js": "fetch('/x')" }), /ağ/);
});

test("short restaurant briefs expand into a full information architecture", () => {
  const plan = completeBuilderPlan("Bana lüks bir restoran sitesi yap.");
  assert.equal(plan.kind, "rezervasyon");
  assert.ok(plan.pages?.includes("Ana sayfa"));
  assert.ok(plan.pages?.includes("Menü"));
  assert.ok(plan.pages?.includes("Rezervasyon"));
  assert.ok(plan.pages?.includes("Hakkımızda"));
  assert.ok(plan.pages?.includes("İletişim"));
  assert.ok(plan.features?.includes("header"));
  assert.ok(plan.features?.includes("mobil menü"));
  const kept = completeBuilderPlan("restoran", { kind: "rezervasyon", pages: ["Giriş", "Menü", "Rezerv", "Hakkımızda", "İletişim"] });
  assert.deepEqual(kept.pages, ["Giriş", "Menü", "Rezerv", "Hakkımızda", "İletişim"]);
  assert.ok(defaultPagesForKind("todo").includes("Liste"));
});

test("five natural-language briefs map to distinct architectures", () => {
  const jewelry = completeBuilderPlan("Modern ve premium bir kuyumcu web sitesi oluştur.");
  const shop = completeBuilderPlan("Ürün satabileceğim profesyonel bir e-ticaret sitesi oluştur.");
  const resto = completeBuilderPlan("Bir restoran için modern rezervasyon sitesi oluştur.");
  const company = completeBuilderPlan("Profesyonel şirket web sitesi oluştur.");
  const saas = completeBuilderPlan("Modern bir SaaS yönetim paneli oluştur.");
  assert.equal(jewelry.kind, "e-ticaret");
  assert.equal(shop.kind, "e-ticaret");
  assert.equal(resto.kind, "rezervasyon");
  assert.equal(company.kind, "landing");
  assert.equal(saas.kind, "panel");
  assert.ok(jewelry.pages?.includes("Sepet"));
  assert.ok(resto.pages?.includes("Rezervasyon"));
  assert.ok(company.pages?.includes("Hizmetler"));
  assert.ok(company.pages?.includes("Hakkımızda"));
  assert.ok(saas.pages?.includes("Panel"));
  assert.notDeepEqual(jewelry.pages, resto.pages);
  assert.notDeepEqual(company.pages, saas.pages);
});
