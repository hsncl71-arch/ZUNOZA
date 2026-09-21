import assert from "node:assert/strict";
import test from "node:test";
import { wantsWebSearch, isClockQuestion, isSearchFollowUp, skipWebForAttachedImage } from "./web-search-intent.ts";

test("current facts search without asking to search the web", () => {
  assert.equal(wantsWebSearch("İstanbul hava nasıl"), true);
  assert.equal(wantsWebSearch("hava durumu"), true);
  assert.equal(wantsWebSearch("bugün ne oldu"), true);
  assert.equal(wantsWebSearch("dolar kaç"), true);
  assert.equal(wantsWebSearch("Galatasaray maç sonucu"), true);
  assert.equal(wantsWebSearch("Turkcell müşteri hizmetleri telefonu nedir"), true);
  assert.equal(wantsWebSearch("internetten araştır bitcoin"), true);
  assert.equal(wantsWebSearch("iPhone 17 Pro Max fiyatı ne kadar?"), true);
  assert.equal(wantsWebSearch("iPhone 17 Pro Max kaç TL"), true);
  assert.equal(wantsWebSearch("bugün hava nasıl"), true);
  assert.equal(wantsWebSearch("bugün dolar kaç"), true);
});

test("casual greetings do not search the web", () => {
  assert.equal(wantsWebSearch("ne haber"), false);
  assert.equal(wantsWebSearch("naber"), false);
  assert.equal(wantsWebSearch("ne haberler"), false);
  assert.equal(wantsWebSearch("bugünkü haber"), true);
  assert.equal(wantsWebSearch("son dakika"), true);
});

test("normal chat does not search", () => {
  assert.equal(wantsWebSearch("merhaba nasılsın"), false);
  assert.equal(wantsWebSearch("saat kaç"), false);
  assert.equal(wantsWebSearch("seni kim üretti"), false);
  assert.equal(wantsWebSearch("video yap uzay sahnesi"), false);
  assert.equal(wantsWebSearch("bunu not al"), false);
  assert.equal(wantsWebSearch("2+2 kaç"), false);
  assert.equal(wantsWebSearch("bana bir şiir yaz"), false);
});

test("today questions are not clock-only when they need the web", () => {
  assert.equal(isClockQuestion("saat kaç"), true);
  assert.equal(isClockQuestion("bugünün tarihi"), true);
  assert.equal(isClockQuestion("bugün hava nasıl"), false);
  assert.equal(isClockQuestion("bugün ne oldu"), false);
  assert.equal(isClockQuestion("bugün dolar kaç"), false);
  assert.equal(isClockQuestion("2+2 kaç"), false);
});

test("short follow-ups reuse the previous search intent", () => {
  assert.equal(isSearchFollowUp("ya yarın"), true);
  assert.equal(isSearchFollowUp("peki ya İstanbul"), true);
  assert.equal(wantsWebSearch("ya yarın", "İstanbul hava nasıl"), true);
  assert.equal(wantsWebSearch("peki ya Ankara", "bugün hava nasıl"), true);
  assert.equal(wantsWebSearch("ya yarın", "bana bir şiir yaz"), false);
});

test("attached images prefer vision unless the ask is a current fact", () => {
  assert.equal(skipWebForAttachedImage("bu fotoğrafta ne var", true), true);
  assert.equal(skipWebForAttachedImage("dolar kaç", true), false);
  assert.equal(skipWebForAttachedImage("merhaba", false), false);
});
