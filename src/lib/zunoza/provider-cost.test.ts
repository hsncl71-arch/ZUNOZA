import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  VIDEO_USD_PER_SEC,
  IMAGE_OUTPUT_USD,
  ELEVEN_MUSIC_USD_PER_MIN,
  XAI_TTS_USD_PER_MILLION_CHARS,
  XAI_VOICE_USD_PER_MIN,
  SHOTSTACK_USD_PER_MIN,
  WEB_SEARCH_USD_PER_CALL,
  USD_TRY_SNAPSHOT,
  VIDEO_CREDIT_TABLE,
  estimateVideoUsd,
  estimateImageUsd,
  estimateMusicUsd,
  estimateTtsUsd,
  estimateVoiceLiveUsd,
  estimateMontageUsd,
  estimateChatUsd,
  estimateProviderUsd,
  videoCreditsCharged,
  plusCreditTry,
  creditUsd,
  usdToTry,
  spendWouldBlock,
} from "./provider-cost.ts";

describe("official list prices (docs.x.ai 2026-09-07)", () => {
  it("keeps grok-imagine-video-1.5 per-second rates", () => {
    assert.equal(VIDEO_USD_PER_SEC["480p"], 0.08);
    assert.equal(VIDEO_USD_PER_SEC["720p"], 0.14);
    assert.equal(VIDEO_USD_PER_SEC["1080p"], 0.25);
  });
  it("keeps grok-imagine-image-2.0 output rates", () => {
    assert.equal(IMAGE_OUTPUT_USD["grok-imagine-image-2.0"]["1k"], 0.04);
    assert.equal(IMAGE_OUTPUT_USD["grok-imagine-image-2.0"]["2k"], 0.06);
    assert.equal(IMAGE_OUTPUT_USD["grok-imagine-image"]["1k"], 0.02);
  });
  it("keeps voice/tts/tools/music/shotstack published rates", () => {
    assert.equal(XAI_TTS_USD_PER_MILLION_CHARS, 15);
    assert.equal(XAI_VOICE_USD_PER_MIN, 0.08);
    assert.equal(WEB_SEARCH_USD_PER_CALL, 0.005);
    assert.equal(ELEVEN_MUSIC_USD_PER_MIN, 0.15);
    assert.equal(SHOTSTACK_USD_PER_MIN, 0.3);
  });
});

describe("video unit economics vs Plus pack", () => {
  it("keeps the rebalanced credit table", () => {
    assert.equal(VIDEO_CREDIT_TABLE["5"].ekonomik, 3);
    assert.equal(VIDEO_CREDIT_TABLE["15"].ultra, 27);
    assert.equal(VIDEO_CREDIT_TABLE["30"].ultra, 54);
    assert.equal(videoCreditsCharged(5, "ekonomik"), 3);
    assert.equal(videoCreditsCharged(30, "ultra"), 54);
  });
  it("prices 5/10/15/30s clips from official per-second rates", () => {
    assert.equal(estimateVideoUsd({ durationSeconds: 5, quality: "ekonomik" }), 0.4);
    assert.equal(estimateVideoUsd({ durationSeconds: 10, quality: "standart" }), 1.4);
    assert.equal(estimateVideoUsd({ durationSeconds: 15, quality: "hd" }), 2.1);
    assert.equal(estimateVideoUsd({ durationSeconds: 15, quality: "ultra" }), 3.75);
    assert.equal(estimateVideoUsd({ durationSeconds: 30, quality: "ekonomik" }), 2.4);
    assert.equal(estimateVideoUsd({ durationSeconds: 30, quality: "ultra" }), 7.5);
    assert.equal(estimateVideoUsd({ durationSeconds: 5, quality: "ekonomik", imageInputs: 1 }), 0.41);
  });
  it("covers Plus 399 TRY / 160 credits against official video rates at snapshot FX", () => {
    assert.equal(plusCreditTry(), 399 / 24);
    const skus: Array<[number, string]> = [
      [5, "ekonomik"],
      [5, "ultra"],
      [10, "standart"],
      [15, "hd"],
      [15, "ultra"],
      [30, "ekonomik"],
      [30, "ultra"],
    ];
    for (const [seconds, quality] of skus) {
      const cost = estimateVideoUsd({ durationSeconds: seconds, quality });
      const revenue = creditUsd(videoCreditsCharged(seconds, quality));
      assert.ok(revenue + 1e-9 >= cost, `${seconds}s ${quality}: credit ${revenue} should cover cost ${cost}`);
    }
  });
});

describe("non-video estimates", () => {
  it("prices images, music, tts, voice, montage", () => {
    assert.equal(estimateImageUsd("grok-imagine-image-2.0", 1, "1k"), 0.04);
    assert.equal(estimateImageUsd("grok-imagine-image-2.0", 1, "2k"), 0.06);
    assert.equal(estimateImageUsd("grok-imagine-image-2.0", 1, "1k", 1), 0.05);
    assert.equal(estimateMusicUsd(60), 0.15);
    assert.equal(estimateTtsUsd(1_000_000), 15);
    assert.equal(estimateVoiceLiveUsd(1), 0.08);
    assert.equal(estimateMontageUsd(60), 0.3);
  });
  it("marks chat as estimated and adds web search surcharge", () => {
    const chat = estimateChatUsd("assistant_chat", 800, 400);
    const web = estimateChatUsd("assistant_web", 800, 400);
    assert.ok(web - chat === WEB_SEARCH_USD_PER_CALL);
    assert.ok(chat > 0 
... 