import assert from "node:assert/strict";
import test from "node:test";
import {
  applySeriesBudget,
  emptySeriesBudget,
  maxGeneratedSecondsFor,
  seriesBudgetLabel,
  seriesResolutionFor,
  SERIES_COST_LIMITS,
} from "./series-budget.ts";
import { XAI_VIDEO_CAPABILITIES, seriesUsesVideoExtend } from "./xai-video-capabilities.ts";

test("episode generation cap is 1.5x planned and never above 450s", () => {
  assert.equal(maxGeneratedSecondsFor(60), 90);
  assert.equal(maxGeneratedSecondsFor(300), 450);
  assert.equal(SERIES_COST_LIMITS.maxRegenerationsPerEpisode, 8);
  assert.equal(SERIES_COST_LIMITS.maxRegenerationsPerScene, 2);
  assert.equal(SERIES_COST_LIMITS.maxResolution, "720p");
});

test("series resolution never advertises 1080p on the identity path", () => {
  assert.equal(seriesResolutionFor("ultra", true), "720p");
  assert.equal(seriesResolutionFor("ekonomik", true), "480p");
  assert.equal(seriesResolutionFor("hd", true), "720p");
});

test("budget stops when generated seconds, scene retries, or episode retries overflow", () => {
  const base = emptySeriesBudget({ plannedSeconds: 60, quality: "hd" });
  const first = applySeriesBudget(base, { seconds: 15 });
  assert.equal(first.ok, true);
  assert.equal(first.budget.generatedSeconds, 15);

  let cursor = first.budget;
  for (let i = 0; i < 5; i += 1) {
    const next = applySeriesBudget(cursor, { seconds: 15 });
    cursor = next.budget;
  }
  const overflow = applySeriesBudget(cursor, { seconds: 15 });
  assert.equal(overflow.ok, false);
  assert.match(String(overflow.message), /üretim tavanı doldu/i);
  assert.equal(overflow.budget.stopped, true);

  const regen1 = applySeriesBudget(first.budget, { regeneration: true, sceneId: "s1" });
  const regen2 = applySeriesBudget(regen1.budget, { regeneration: true, sceneId: "s1" });
  const regen3 = applySeriesBudget(regen2.budget, { regeneration: true, sceneId: "s1" });
  assert.equal(regen2.ok, true);
  assert.equal(regen3.ok, false);
  assert.match(String(regen3.message), /en fazla 2 kez/);

  let episode = first.budget;
  for (let i = 0; i < 8; i += 1) {
    episode = applySeriesBudget(episode, { regeneration: true, sceneId: `n${i}` }).budget;
  }
  const ninth = applySeriesBudget(episode, { regeneration: true, sceneId: "n8" });
  assert.equal(ninth.ok, false);
  assert.match(seriesBudgetLabel(first.budget), /720p/);
});

test("product model does not use video extend or edit", () => {
  assert.equal(XAI_VIDEO_CAPABILITIES.extend.productModelSupported, false);
  assert.equal(XAI_VIDEO_CAPABILITIES.edit.productModelSupported, false);
  assert.equal(XAI_VIDEO_CAPABILITIES.extend.usedInProduct, false);
  assert.equal(seriesUsesVideoExtend(), false);
  assert.match(XAI_VIDEO_CAPABILITIES.extend.reason, /1\.5/);
});
