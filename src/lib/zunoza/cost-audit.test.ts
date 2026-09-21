import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COST_FX_SNAPSHOT,
  VIDEO_MODEL,
  usdToKurus,
  videoUnitRows,
  packageCashRows,
  otherUnitRows,
  PAID_SERVICES,
} from "./cost-audit.ts";
import { estimateVideoUsd } from "./provider-cost.ts";

test("video unit costs are 5/10/15 only and match xAI per-second list prices", () => {
  const rows = videoUnitRows();
  assert.equal(VIDEO_MODEL, "grok-imagine-video-1.5");
  assert.deepEqual([...new Set(rows.map((r) => r.seconds))], [5, 10, 15]);
  assert.equal(rows.find((r) => r.seconds === 5 && r.quality === "ekonomik")?.providerUsd, 0.4);
  assert.equal(rows.find((r) => r.seconds === 10 && r.quality === "standart")?.providerUsd, 1.4);
  assert.equal(rows.find((r) => r.seconds === 15 && r.quality === "hd")?.providerUsd, 2.1);
  assert.equal(rows.find((r) => r.seconds === 15 && r.quality === "ultra")?.providerUsd, 3.75);
  assert.equal(
    rows.find((r) => r.seconds === 15 && r.quality === "hd")?.providerUsd,
    rows.find((r) => r.seconds === 15 && r.quality === "standart")?.providerUsd,
  );
  assert.equal(usdToKurus(0.4), Math.round(0.4 * COST_FX_SNAPSHOT * 100));
  assert.equal(rows.find((r) => r.seconds === 5 && r.quality === "ekonomik")?.providerKurus, usdToKurus(0.4));
  assert.equal(estimateVideoUsd({ durationSeconds: 5, quality: "ekonomik", imageInputs: 1 }), 0.41);
});

test("paid service catalog has env names only and no 30s product video", () => {
  const src = readFileSync("src/lib/zunoza/cost-audit.ts", "utf8");
  assert.match(src, /XAI_API_KEY/);
  assert.doesNotMatch(src, /sk-[A-Za-z0-9]/);
  assert.ok(PAID_SERVICES.some((s) => s.id === "xai-video" && s.status === "aktif"));
  assert.ok(PAID_SERVICES.some((s) => s.id === "apple-iap" && s.status === "hazir-pasif"));
  assert.equal(otherUnitRows().find((r) => r.id === "stt")?.note, "bilinmiyor");
  const plus = packageCashRows().find((p) => p.id === "plus");
  assert.ok(plus);
  assert.equal(plus!.priceTry, 399);
  assert.equal(plus!.vatTry, 66.5);
  assert.doesNotMatch(src, /seconds: 30/);
});
