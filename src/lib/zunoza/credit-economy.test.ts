import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CREDIT_PER_USD,
  DEFAULT_FEATURE_CREDITS,
  DEFAULT_PACKAGES,
  DEFAULT_VIDEO_CREDIT_TABLE,
  IYZICO_ASSUMPTION_LABEL,
  IYZICO_ASSUMPTION_PCT,
  USABLE_FRACTION,
  WELCOME_CREDITS_DEFAULT,
  burnAllCredits,
  formulaVideoCredits,
  formulaVideoUsd,
  freeUserMaxCostTry,
  imageCredits,
  iyzicoAmountTry,
  packVideoEstimate,
  pickWorstAffordable,
  scaleLegacyCredits,
  stressAllPackages,
  usableCollectionTry,
  vatAmountTry,
  verdictFor,
} from "./credit-economy.ts";

const SAFE = new Set(["ÇOK GÜVENLİ", "GÜVENLİ"]);

describe("pricing assumption", () => {
  it("uses 3% iyzico as a labeled assumption, not a contract rate", () => {
    assert.equal(IYZICO_ASSUMPTION_PCT, 3);
    assert.equal(IYZICO_ASSUMPTION_LABEL, "Fiyatlandırma varsayımı: %3");
    assert.equal(Math.round(USABLE_FRACTION * 1e6) / 1e6, Math.round((1 - 0.2 / 1.2 - 0.03) * 1e6) / 1e6);
  });
  it("splits VAT-inclusive price into VAT, iyzico assumption, and usable cash", () => {
    const price = 399;
    assert.equal(vatAmountTry(price), 66.5);
    assert.equal(iyzicoAmountTry(price), 11.97);
    assert.equal(usableCollectionTry(price), 320.53);
    assert.ok(usableCollectionTry(price) + vatAmountTry(price) + iyzicoAmountTry(price) - price < 0.02);
  });
});

describe("video credit formula", () => {
  it("charges more for longer, higher-resolution clips and bills 30s as 2×15s", () => {
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["5"].ekonomik, 3);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["5"].standart, 5);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["5"].hd, 6);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["5"].ultra, 9);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["10"].ekonomik, 6);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["10"].standart, 10);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["10"].ultra, 18);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["15"].ekonomik, 9);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["15"].standart, 15);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["15"].ultra, 27);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["30"].ekonomik, 18);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["30"].ultra, 54);
    assert.equal(DEFAULT_VIDEO_CREDIT_TABLE["30"].ultra, DEFAULT_VIDEO_CREDIT_TABLE["15"].ultra * 2);
  });
  it("keeps HD above Standart via quality coefficient, Ultra far above HD", () => {
    assert.ok(DEFAULT_VIDEO_CREDIT_TABLE["5"].hd > DEFAULT_VIDEO_CREDIT_TABLE["5"].standart);
    assert.ok(DEFAULT_VIDEO_CREDIT_TABLE["5"].ultra > DEFAULT_VIDEO_CREDIT_TABLE["5"].hd);
    assert.ok(formulaVideoUsd(5, "ultra") > formulaVideoUsd(5, "ekonomik") * 2);
  });
  it("prices credits from real USD plus storage, not 1 credit = 1 second", () => {
    assert.equal(CREDIT_PER_USD, 7);
    assert.equal(formulaVideoCredits(5, "ekonomik"), 3);
    assert.ok(DEFAULT_VIDEO_CREDIT_TABLE["15"].ultra > DEFAULT_VIDEO_CREDIT_TABLE["15"].standart);
  });
});

describe("feature credits", () => {
  it("prices cheap features far below video", () => {
    assert.equal(DEFAULT_FEATURE_CREDITS.image_generate_1k, 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.image_generate_2k, 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.image_edit_1k, 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.music_15, 1);
    assert.ok(DEFAULT_FEATURE_CREDITS.music_45 >= 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.assistant_chat, 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.assistant_web, 1);
    assert.equal(DEFAULT_FEATURE_CREDITS.builder_create, 2);
    assert.ok(DEFAULT_FEATURE_CREDITS.voice_live >= 6);
    assert.ok(DEFAULT_FEATURE_CREDITS.voice_song_45 >= 4);
    assert.ok(DEFAULT_FEATURE_CREDITS.image_generate_1k < DEFAULT_VIDEO_CREDIT_TABLE["5"].ekonomik);
  });
  it("honors an admin catalog override for images", () => {
    assert.equal(imageCredits("generate", "1k", 1, { ...DEFAULT_FEATURE_CREDITS, image_generate_1k: 9 }), 9);
  });
});

describe("package profit stress", () => {
  it("does not raise list prices", () => {
    const plus = DEFAULT_PACKAGES.find((p) => p.id === "plus")!;
    const max = DEFAULT_PACKAGES.find((p) => p.id === "max")!;
    assert.equal(plus.priceTry, 399);
    assert.equal(max.priceTry, 2499);
    
... 