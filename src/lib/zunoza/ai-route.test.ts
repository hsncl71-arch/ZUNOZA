import assert from "node:assert/strict";
import test from "node:test";
import { routeAiIntent, specialistPath } from "./ai-route.ts";
import { planVideoPrompt } from "./video-plan.ts";

test("routes app build to builder without extra model", () => {
  const r = routeAiIntent("Bana bir tesbih satış sitesi yap.");
  assert.equal(r.specialist, "builder");
  assert.equal(specialistPath("builder"), "/insa-et");
});

test("routes video production and keeps chat as default", () => {
  assert.equal(routeAiIntent("9:16 video üret, iPhone reklamı çek").specialist, "video");
  assert.equal(routeAiIntent("Merhaba, nasılsın?").specialist, "assistant");
});

test("video plan clamps to real provider fields", () => {
  const plan = planVideoPrompt("4k 60 saniye video edit yap", {
    durationSeconds: 60,
    aspect: "21:9",
    quality: "ultra",
    voiceMode: "sessiz",
  });
  assert.equal(plan.duration, 15);
  assert.equal(plan.aspect, "16:9");
  assert.equal(plan.generateAudio, false);
  assert.ok(plan.unsupported.length >= 1);
});
