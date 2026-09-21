import assert from "node:assert/strict";
import test from "node:test";
import { builderCreditHint, readCatalogCost } from "./builder-credit.ts";
import {
  BUILDER_THINK_STALL_MS,
  builderJobTimeoutCopy,
  builderThinkLine,
  builderThinkProgress,
  builderThinkStallCopy,
  builderThinkStalled,
  formatRunClock,
  groupBuilderFlow,
  resultBullets,
  workLineKind,
  workSectionTitle,
} from "./builder-flow-ui.ts";

test("clock and section titles stay short and product-facing", () => {
  assert.equal(formatRunClock(18_000), "00:18");
  assert.equal(formatRunClock(97_000), "01:37");
  assert.equal(workSectionTitle("Mevcut proje incelendi."), "Analiz");
  assert.equal(workSectionTitle("Sayfalar: vitrin, sepet."), "Planlama");
  assert.equal(workLineKind("Ana sayfa güncellendi."), "ok");
  assert.equal(workLineKind("Düşünülüyor…"), "run");
  assert.equal(workLineKind("API bağlantısı başarısız"), "err");
});

test("flow groups agent lines under the latest user prompt", () => {
  const blocks = groupBuilderFlow(
    [
      { id: "u1", kind: "user", text: "E-ticaret sitesi yap" },
      { id: "log:a", kind: "agent", text: "Mevcut proje incelendi." },
      { id: "log:b", kind: "agent", text: "Sayfalar: vitrin, sepet." },
      { id: "u2", kind: "user", text: "Kartları büyüt" },
      { id: "think", kind: "agent", text: "Düşünülüyor…" },
      { id: "queue:q1", kind: "queue", text: "SIRADA · Kartları büyüt" },
    ],
    true,
  );
  assert.equal(blocks[0]?.type, "user");
  assert.equal(blocks[1]?.type, "work");
  if (blocks[1]?.type === "work") {
    assert.equal(blocks[1].items.length, 2);
    assert.equal(blocks[1].title, "Analiz");
  }
  assert.equal(blocks[2]?.type, "user");
  assert.equal(blocks[3]?.type, "work");
  if (blocks[3]?.type === "work") assert.equal(blocks[3].live, true);
  assert.equal(blocks[4]?.type, "queue");
});

test("result bullets keep real activity, not empty filler", () => {
  assert.deepEqual(resultBullets(["x", "Ana sayfa oluşturuldu.", "Ana sayfa oluşturuldu.", "Mobil görünüm hazırlandı."]), [
    "Ana sayfa oluşturuldu.",
    "Mobil görünüm hazırlandı.",
  ]);
});

test("think stall clock, progress, and copy stay honest", () => {
  assert.equal(BUILDER_THINK_STALL_MS, 90_000);
  assert.equal(builderThinkStalled(89_999), false);
  assert.equal(builderThinkStalled(90_000), true);
  assert.equal(builderThinkProgress(0), 0);
  assert.equal(builderThinkProgress(45_000), 50);
  assert.equal(builderThinkProgress(90_000), 100);
  assert.equal(builderThinkProgress(120_000), 100);
  assert.equal(builderThinkLine(18_000), "Düşünülüyor… 00:18");
  assert.match(builderThinkLine(91_000), /90 saniyeyi aştı/);
  assert.match(builderThinkStallCopy(), /90 saniyeyi/);
  assert.match(builderJobTimeoutCopy(), /zaman aşımına/);
});

test("credit hint says whether each send deducts credits", () => {
  assert.equal(builderCreditHint({ unlimited: true, cost: 2 }), "Her gönderim kredi düşmez (sınırsız hesap).");
  assert.equal(builderCreditHint({ cost: 0 }), "Her gönderim kredi düşmez.");
  assert.equal(builderCreditHint({ cost: 2, balance: 9 }), "Her gönderim 2 kredi kullanır. Kalan: 9 kredi.");
  assert.equal(builderCreditHint({ cost: 1, action: "retry" }), "Tekrar deneme 1 kredi kullanır.");
  assert.equal(
    builderCreditHint({ unlimited: true, cost: 1, action: "retry" }),
    "Tekrar deneme kredi düşmez (sınırsız hesap).",
  );
  assert.equal(readCatalogCost(0, 2), 0);
  assert.equal(readCatalogCost(3, 2), 3);
  assert.equal(readCatalogCost(undefined, 2), 2);
  assert.equal(readCatalogCost(-1, 2), 2);
});
