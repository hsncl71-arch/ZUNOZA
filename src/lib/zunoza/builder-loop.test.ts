import assert from "node:assert/strict";
import test from "node:test";
import {
  describeIntent,
  dumpFilesForAgent,
  inspectExistingApp,
  isIncrementalInstruction,
  needsUserClarification,
  selectFilesToTouch,
} from "./builder-loop.ts";

const shop = {
  "index.html": `<html><nav><a href="#menu">Menü</a></nav><main data-screen="ana"></main><main data-screen="menu"></main></html>`,
  "styles.css": "body{margin:0}",
  "app.js": "function addToCart(){}",
  "data.json": "[]",
};

test("short follow-ups stay incremental and do not wipe the app", () => {
  assert.equal(isIncrementalInstruction("menüyü düzelt", true), true);
  assert.equal(isIncrementalInstruction("ödeme ekle", true), true);
  assert.equal(isIncrementalInstruction("mobil görünümü düzelt", true), true);
  assert.equal(isIncrementalInstruction("sıfırdan yeni uygulama oluştur", true), false);
  assert.equal(isIncrementalInstruction("menüyü düzelt", false), false);
});

test("file targeting stays surgical", () => {
  assert.deepEqual(selectFilesToTouch(shop, "mobil taşmaları düzelt"), ["styles.css", "index.html"]);
  assert.ok(selectFilesToTouch(shop, "ödeme ekle").includes("app.js"));
  assert.ok(selectFilesToTouch(shop, "menüyü düzelt").includes("index.html"));
  const picked = selectFilesToTouch(shop, "[SEÇİLİ BÖLÜM: Hero alanı]\nBunu daha premium yap.");
  assert.deepEqual(picked, ["index.html", "styles.css"]);
});

test("inspect writes honest activity, never a live payment", () => {
  const inspect = inspectExistingApp(shop, "ödeme ekle", null, ["Menüyü premium yap"]);
  assert.equal(inspect.incremental, true);
  assert.match(inspect.intent, /ödeme/);
  assert.ok(inspect.activity.some((l) => /Mevcut proje incelendi/.test(l)));
  assert.ok(inspect.activity.some((l) => /Yalnızca gerekli dosyalar/.test(l)));
  assert.ok(inspect.activity.some((l) => /Önceki görevler/.test(l)));
  const fresh = inspectExistingApp({}, "Bana lüks bir restoran sitesi yap");
  assert.equal(fresh.incremental, false);
  assert.ok(fresh.activity.some((l) => /Sayfalar:/.test(l)));
  assert.ok(fresh.activity.some((l) => /Hakkımızda/.test(l)));
  assert.ok(inspect.notes.some((n) => /tahsilat|iyzico/i.test(n)));
  assert.equal(inspect.activity.some((l) => /iyzico bağlandı|canlı ödeme çalışıyor/i.test(l)), false);
  assert.match(describeIntent("mobil görünümü düzelt"), /mobil/);
});

test("agent dump marks keep vs touch files", () => {
  const dump = dumpFilesForAgent(shop, ["styles.css", "index.html"], true);
  assert.match(dump, /styles\.css \(DEĞİŞTİRİLEBİLİR\)/);
  assert.match(dump, /app\.js \(KORU, yeniden yazma\)/);
});

test("deictic edits without a selected region ask instead of rewriting the app", () => {
  assert.equal(needsUserClarification("Şurayı biraz büyüt."), true);
  assert.equal(needsUserClarification("Buraya bir buton koy."), false);
  assert.equal(needsUserClarification("Menüyü sağa al."), false);
  assert.equal(needsUserClarification("Bunu daha lüks yap."), false);
  assert.equal(needsUserClarification("Mobilde burası kötü olmuş düzelt."), false);
  assert.equal(needsUserClarification("[SEÇİLİ BÖLÜM: Hero alanı]\nŞurayı biraz büyüt."), false);
  const inspect = inspectExistingApp(shop, "Şurayı biraz büyüt.");
  assert.ok(inspect.askUser.some((n) => /Bölüm seç|daha açık yazın/.test(n)));
});
