import assert from "node:assert/strict";
import test from "node:test";
import { wantsWebSearch } from "../src/lib/zunoza/web-search-intent.ts";

test("current facts search without asking internellen araştır", () => {
  assert.equal(wantsWebSearch("İstanbul hava nasıl"), true);
  assert.equal(wantsWebSearch("hava durumu"), true);
  assert.equal(wantsWebSearch("bugün ne oldu"), true);
  assert.equal(wantsWebSearch("dolar kaç"), true);
  assert.equal(wantsWebSearch("Galatasaray maç sonucu"), true);
  assert.equal(wantsWebSearch("Turkcell müşteri hizmetleri telefonu nedir"), true);
  assert.equal(wantsWebSearch("internetten araştır bitcoin"), true);
});

test("normal chat does not search", () => {
  assert.equal(wantsWebSearch("merhaba nasılsın"), false);
  assert.equal(wantsWebSearch("saat kaç"), false);
  assert.equal(wantsWebSearch("seni kim üretti"), false);
  assert.equal(wantsWebSearch("video yap uzay sahnesi"), false);
  assert.equal(wantsWebSearch("bunu not al"), false);
});
